const mongoose = require("mongoose");

const Room = require("../models/Room");
const Transaction = require("../models/Transaction");
const { computeBalances } = require("../utils/balances");
const { notifyRoomMembers } = require("../services/notify");
const { emitToRoom } = require("../socket/io");

/**
 * Round a monetary value to 2 decimal places, guarding against
 * floating point noise. Returns a Number.
 */
function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resolve the currency symbol for a room, falling back to an empty string.
 */
function roomSymbol(room) {
  return (room && room.currency && room.currency.symbol) || "";
}

/**
 * Load the room referenced by req.params.roomId and ensure the
 * authenticated user (req.userId) is a member.
 *
 * Throws an Error with a `status` property when:
 *   - 400 the roomId is not a valid ObjectId
 *   - 404 the room does not exist
 *   - 403 the user is not a member of the room
 *
 * Returns { room, isAdmin } on success. The room document is populated
 * with member user objects so callers can compute balances directly.
 */
async function loadRoomMember(req) {
  const roomId = req.params.roomId;

  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    const err = new Error("Invalid room id");
    err.status = 400;
    throw err;
  }

  const room = await Room.findById(roomId).populate(
    "members.user",
    "_id firstName lastName avatar email"
  );

  if (!room) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }

  const isMember = room.members.some((m) => {
    const u = m.user;
    if (!u) return false;
    const id = u._id ? u._id : u;
    return String(id) === String(req.userId);
  });

  if (!isMember) {
    const err = new Error("You are not a member of this room");
    err.status = 403;
    throw err;
  }

  const isAdmin = String(room.admin) === String(req.userId);
  const isPayer = Array.isArray(room.payers)
    ? room.payers.some((p) => String(p) === String(req.userId))
    : false;
  // Admin OR a selected payer can record/delete deposits & expenses.
  const canManage = isAdmin || isPayer;

  return { room, isAdmin, isPayer, canManage };
}

/**
 * Build the array of plain member user objects (each having _id) from a
 * populated room, suitable for computeBalances.
 */
function memberUserObjects(room) {
  return room.members
    .map((m) => m.user)
    .filter(Boolean)
    .map((u) => (typeof u.toObject === "function" ? u.toObject() : u));
}

/**
 * Fetch and fully populate a single transaction for the response body.
 */
function populateTransaction(query) {
  return query
    .populate("createdBy", "_id firstName lastName avatar email")
    .populate("allocations.user", "_id firstName lastName avatar email")
    .populate("splitAmong.user", "_id firstName lastName avatar email");
}

/**
 * GET /api/rooms/:roomId/transactions
 * List all transactions for the room, newest first.
 */
async function list(req, res) {
  try {
    await loadRoomMember(req);

    const transactions = await populateTransaction(
      Transaction.find({ room: req.params.roomId })
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ transactions });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to load transactions" });
  }
}

/**
 * POST /api/rooms/:roomId/transactions/deposits
 * ADMIN ONLY. body: { note, allocations:[{user, amount}] }
 * Records who contributed how much to the pool.
 */
async function createDeposit(req, res) {
  try {
    const { room, canManage } = await loadRoomMember(req);

    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Only the admin or a selected payer can add deposits" });
    }

    const { note } = req.body || {};
    const rawAllocations = Array.isArray(req.body && req.body.allocations)
      ? req.body.allocations
      : [];

    const allocations = rawAllocations
      .map((a) => ({
        user: a && a.user,
        amount: round2(a && a.amount),
      }))
      .filter((a) => a.user && a.amount > 0);

    if (allocations.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one positive contribution is required" });
    }

    const totalAmount = round2(
      allocations.reduce((sum, a) => sum + a.amount, 0)
    );

    const created = await Transaction.create({
      room: room._id,
      type: "deposit",
      note: note || "",
      totalAmount,
      createdBy: req.userId,
      allocations,
      splitAmong: [],
    });

    const symbol = roomSymbol(room);

    await notifyRoomMembers({
      roomId: room._id,
      exceptUserId: req.userId,
      type: "deposit",
      title: "Money added to room",
      body: `${symbol}${totalAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })} contributed`,
      data: { roomId: String(room._id), transactionId: String(created._id) },
    });

    emitToRoom(String(room._id), "room:update", { roomId: String(room._id) });

    const transaction = await populateTransaction(
      Transaction.findById(created._id)
    ).lean();

    return res.status(201).json({ transaction });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to record deposit" });
  }
}

/**
 * POST /api/rooms/:roomId/transactions/expenses
 * ADMIN ONLY. body: { title, category, totalAmount, splitAmong:[{user, amount}] }
 * Records an expense and who shares it.
 */
async function createExpense(req, res) {
  try {
    const { room, canManage } = await loadRoomMember(req);

    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Only the admin or a selected payer can add expenses" });
    }

    const { title, category } = req.body || {};
    const rawSplit = Array.isArray(req.body && req.body.splitAmong)
      ? req.body.splitAmong
      : [];

    const splitAmong = rawSplit
      .map((s) => ({
        user: s && s.user,
        amount: round2(s && s.amount),
      }))
      .filter((s) => s.user && s.amount > 0);

    let totalAmount = round2(req.body && req.body.totalAmount);

    // Fall back to (or correct against) the sum of shares so the ledger stays consistent.
    const splitSum = round2(
      splitAmong.reduce((sum, s) => sum + s.amount, 0)
    );

    if (!(totalAmount > 0)) {
      totalAmount = splitSum;
    }

    if (!(totalAmount > 0)) {
      return res
        .status(400)
        .json({ message: "Expense amount must be greater than zero" });
    }

    if (splitAmong.length === 0) {
      return res
        .status(400)
        .json({ message: "Select at least one person to share this expense" });
    }

    const created = await Transaction.create({
      room: room._id,
      type: "expense",
      title: title || "",
      category: category || "",
      totalAmount,
      createdBy: req.userId,
      allocations: [],
      splitAmong,
    });

    const symbol = roomSymbol(room);

    await notifyRoomMembers({
      roomId: room._id,
      exceptUserId: req.userId,
      type: "expense",
      title: "New expense in room",
      body: `${title || "Expense"} • ${symbol}${totalAmount.toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )}`,
      data: { roomId: String(room._id), transactionId: String(created._id) },
    });

    emitToRoom(String(room._id), "room:update", { roomId: String(room._id) });

    const transaction = await populateTransaction(
      Transaction.findById(created._id)
    ).lean();

    return res.status(201).json({ transaction });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to record expense" });
  }
}

/**
 * GET /api/rooms/:roomId/transactions/balances
 * Returns the computed balances for the room.
 */
async function balances(req, res) {
  try {
    const { room } = await loadRoomMember(req);

    const transactions = await Transaction.find({ room: room._id }).lean();
    const members = memberUserObjects(room);

    const result = computeBalances(transactions, members);

    return res.json({ balances: result });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to compute balances" });
  }
}

/**
 * DELETE /api/rooms/:roomId/transactions/:txId
 * ADMIN ONLY. Removes a transaction from the room.
 */
async function deleteTransaction(req, res) {
  try {
    const { room, canManage } = await loadRoomMember(req);

    if (!canManage) {
      return res
        .status(403)
        .json({ message: "Only the admin or a selected payer can delete transactions" });
    }

    const { txId } = req.params;

    if (!txId || !mongoose.Types.ObjectId.isValid(txId)) {
      return res.status(400).json({ message: "Invalid transaction id" });
    }

    const deleted = await Transaction.findOneAndDelete({
      _id: txId,
      room: room._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    emitToRoom(String(room._id), "room:update", { roomId: String(room._id) });

    return res.json({ ok: true });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Failed to delete transaction" });
  }
}

module.exports = {
  loadRoomMember,
  list,
  createDeposit,
  createExpense,
  balances,
  deleteTransaction,
};
