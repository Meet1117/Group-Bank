const User = require("../models/User");
const Room = require("../models/Room");
const JoinRequest = require("../models/JoinRequest");
const Transaction = require("../models/Transaction");
const { computeBalances } = require("../utils/balances");
const { generateRoomCode } = require("../utils/code");
const { createNotification, notifyRoomMembers } = require("../services/notify");
const { emitToRoom, emitToUser } = require("../socket/io");

// Helpers ------------------------------------------------------------------

// A member's `user` may be a raw ObjectId or a populated user object.
function memberId(m) {
  const u = m && m.user;
  if (!u) return null;
  return u._id ? String(u._id) : String(u);
}

function isMember(room, userId) {
  const uid = String(userId);
  return room.members.some((m) => memberId(m) === uid);
}

function isAdmin(room, userId) {
  const a = room.admin && room.admin._id ? room.admin._id : room.admin;
  return String(a) === String(userId);
}

function memberPublicSelect() {
  return "_id firstName lastName avatar email";
}

// Generate a unique room code with a retry loop.
async function createUniqueCode() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateRoomCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Room.exists({ code });
    if (!existing) return code;
  }
  // Extremely unlikely fallback: append timestamp entropy.
  return `${generateRoomCode()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

// POST /api/rooms ----------------------------------------------------------
async function createRoom(req, res) {
  try {
    const me = req.user._id;
    const { name, currency, joinType } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const safeCurrency =
      currency && currency.code
        ? {
            code: currency.code,
            symbol: currency.symbol,
            name: currency.name,
          }
        : { code: "INR", symbol: "₹", name: "Indian Rupee" };

    const safeJoinType = joinType === "invite" ? "invite" : "open";

    const code = await createUniqueCode();

    const room = await Room.create({
      name: String(name).trim(),
      currency: safeCurrency,
      code,
      joinType: safeJoinType,
      admin: me,
      members: [{ user: me, joinedAt: new Date() }],
    });

    const populated = await Room.findById(room._id)
      .populate("members.user", memberPublicSelect())
      .lean();

    return res.status(201).json({ room: populated });
  } catch (err) {
    console.error("createRoom error:", err);
    return res.status(500).json({ message: "Failed to create room" });
  }
}

// GET /api/rooms -----------------------------------------------------------
async function listRooms(req, res) {
  try {
    const me = req.user._id;

    const rooms = await Room.find({ "members.user": me })
      .populate("members.user", "_id firstName lastName avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const roomIds = rooms.map((r) => r._id);

    // Pull all transactions for these rooms in one query, then group.
    const transactions = await Transaction.find({ room: { $in: roomIds } })
      .select("room type totalAmount")
      .lean();

    const sums = new Map(); // roomId -> {deposited, spent}
    for (const tx of transactions) {
      const key = String(tx.room);
      if (!sums.has(key)) sums.set(key, { deposited: 0, spent: 0 });
      const bucket = sums.get(key);
      const amount = Number(tx.totalAmount) || 0;
      if (tx.type === "deposit") bucket.deposited += amount;
      else if (tx.type === "expense") bucket.spent += amount;
    }

    const out = rooms.map((room) => {
      const bucket = sums.get(String(room._id)) || { deposited: 0, spent: 0 };
      const bankBalance =
        Math.round((bucket.deposited - bucket.spent) * 100) / 100;
      const memberUsers = Array.isArray(room.members)
        ? room.members.map((m) => m.user).filter(Boolean)
        : [];
      return {
        _id: room._id,
        name: room.name,
        code: room.code,
        currency: room.currency,
        joinType: room.joinType,
        memberCount: Array.isArray(room.members) ? room.members.length : 0,
        // First few members (with avatars) for the stacked preview on cards.
        members: memberUsers.slice(0, 5).map((u) => ({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          avatar: u.avatar,
        })),
        bankBalance,
        role: isAdmin(room, me) ? "admin" : "member",
        updatedAt: room.updatedAt,
      };
    });

    return res.json({ rooms: out });
  } catch (err) {
    console.error("listRooms error:", err);
    return res.status(500).json({ message: "Failed to load rooms" });
  }
}

// GET /api/rooms/:id -------------------------------------------------------
async function getRoom(req, res) {
  try {
    const me = req.user._id;

    const [room, transactions] = await Promise.all([
      Room.findById(req.params.id)
        .populate("members.user", memberPublicSelect())
        .lean(),
      Transaction.find({ room: req.params.id }).lean(),
    ]);

    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isMember(room, me)) {
      return res.status(403).json({ message: "You are not a member of this room" });
    }

    const admin = isAdmin(room, me);
    const role = admin ? "admin" : "member";
    const payerIds = (room.payers || []).map((p) => String(p));
    const isPayer = payerIds.includes(String(me));
    const canManage = admin || isPayer;

    const memberUsers = room.members
      .map((m) => m.user)
      .filter((u) => u && u._id);

    const balances = computeBalances(transactions, memberUsers);

    let pendingRequests = 0;
    if (admin) {
      pendingRequests = await JoinRequest.countDocuments({
        room: room._id,
        status: "pending",
      });
    }

    return res.json({
      room,
      role,
      canManage,
      balances,
      counts: {
        transactions: transactions.length,
        pendingRequests,
      },
    });
  } catch (err) {
    console.error("getRoom error:", err);
    return res.status(500).json({ message: "Failed to load room" });
  }
}

// PATCH /api/rooms/:id ----------------------------------------------------
// Admin-only: edit name, currency and join mode.
async function updateRoom(req, res) {
  try {
    const me = req.user._id;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isAdmin(room, me)) {
      return res.status(403).json({ message: "Only the admin can edit this room" });
    }

    const { name, currency, joinType, payers } = req.body || {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Room name is required" });
      }
      room.name = trimmed;
    }
    if (Array.isArray(payers)) {
      const memberIds = new Set(room.members.map((m) => String(m.user)));
      const adminId = String(room.admin);
      // Only members can be payers; the admin is always able to manage.
      room.payers = [...new Set(payers.map(String))].filter(
        (id) => memberIds.has(id) && id !== adminId
      );
    }
    if (currency && currency.code) {
      room.currency = {
        code: currency.code,
        symbol: currency.symbol,
        name: currency.name,
      };
    }
    if (joinType !== undefined) {
      room.joinType = joinType === "invite" ? "invite" : "open";
    }

    await room.save();
    emitToRoom(room._id, "room:update", { roomId: String(room._id) });

    const populated = await Room.findById(room._id)
      .populate("members.user", memberPublicSelect())
      .lean();
    return res.json({ room: populated });
  } catch (err) {
    console.error("updateRoom error:", err);
    return res.status(500).json({ message: "Failed to update room" });
  }
}

// GET /api/rooms/lookup/:code ---------------------------------------------
// Lightweight preview of a room by code (used by QR/link joins) so the
// client can decide: open -> join instantly, invite -> offer to request.
async function lookupRoom(req, res) {
  try {
    const me = req.user._id;
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ message: "Code is required" });

    const room = await Room.findOne({
      code: new RegExp(`^${escapeRegExp(code)}$`, "i"),
    }).lean();

    if (!room) return res.status(404).json({ message: "Room not found" });

    return res.json({
      room: {
        _id: room._id,
        name: room.name,
        code: room.code,
        currency: room.currency,
        joinType: room.joinType,
        memberCount: Array.isArray(room.members) ? room.members.length : 0,
      },
      alreadyMember: isMember(room, me),
    });
  } catch (err) {
    console.error("lookupRoom error:", err);
    return res.status(500).json({ message: "Failed to look up room" });
  }
}

// POST /api/rooms/join -----------------------------------------------------
async function joinRoom(req, res) {
  try {
    const me = req.user._id;
    const { code } = req.body || {};

    if (!code || !String(code).trim()) {
      return res.status(400).json({ message: "Room code is required" });
    }

    const room = await Room.findOne({
      code: new RegExp(`^${escapeRegExp(String(code).trim())}$`, "i"),
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    // Already a member.
    if (isMember(room, me)) {
      const populated = await Room.findById(room._id)
        .populate("members.user", memberPublicSelect())
        .lean();
      return res.json({ status: "joined", room: populated });
    }

    if (room.joinType === "open") {
      room.members.push({ user: me, joinedAt: new Date() });
      await room.save();

      // Notify everyone already in the room (admin + members) except the joiner.
      await notifyRoomMembers({
        roomId: room._id,
        exceptUserId: me,
        type: "member_joined",
        title: "New member joined",
        body: `${displayName(req.user)} joined ${room.name}`,
        data: { roomId: String(room._id) },
      });

      emitToRoom(room._id, "room:update", { roomId: String(room._id) });

      const populated = await Room.findById(room._id)
        .populate("members.user", memberPublicSelect())
        .lean();
      return res.json({ status: "joined", room: populated });
    }

    // Invite-only: create or reuse a pending join request.
    let request = await JoinRequest.findOne({ room: room._id, user: me });
    if (!request) {
      request = await JoinRequest.create({
        room: room._id,
        user: me,
        status: "pending",
      });
    } else if (request.status !== "pending") {
      request.status = "pending";
      await request.save();
    }

    await createNotification({
      userId: room.admin,
      room: room._id,
      type: "join_request",
      title: "New join request",
      body: `${displayName(req.user)} requested to join ${room.name}`,
      data: { roomId: String(room._id), requestId: String(request._id) },
    });

    emitToUser(room.admin, "request:new", { roomId: String(room._id) });

    return res.json({ status: "requested" });
  } catch (err) {
    console.error("joinRoom error:", err);
    return res.status(500).json({ message: "Failed to join room" });
  }
}

// GET /api/rooms/:id/requests ---------------------------------------------
async function listRequests(req, res) {
  try {
    const me = req.user._id;

    const room = await Room.findById(req.params.id).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isAdmin(room, me)) {
      return res.status(403).json({ message: "Admin only" });
    }

    const requests = await JoinRequest.find({
      room: room._id,
      status: "pending",
    })
      .populate("user", memberPublicSelect())
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ requests });
  } catch (err) {
    console.error("listRequests error:", err);
    return res.status(500).json({ message: "Failed to load requests" });
  }
}

// POST /api/rooms/:id/requests/:reqId -------------------------------------
async function handleRequest(req, res) {
  try {
    const me = req.user._id;
    const { action } = req.body || {};

    if (action !== "accept" && action !== "decline") {
      return res
        .status(400)
        .json({ message: 'action must be "accept" or "decline"' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isAdmin(room, me)) {
      return res.status(403).json({ message: "Admin only" });
    }

    const request = await JoinRequest.findOne({
      _id: req.params.reqId,
      room: room._id,
    });
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (action === "accept") {
      request.status = "accepted";
      await request.save();

      // Add as member if not already present.
      if (!isMember(room, request.user)) {
        room.members.push({ user: request.user, joinedAt: new Date() });
        await room.save();
      }

      const requester = await User.findById(request.user).lean();

      // Notify the requester they were accepted.
      await createNotification({
        userId: request.user,
        room: room._id,
        type: "request_accepted",
        title: "Request accepted",
        body: `You were added to ${room.name}`,
        data: { roomId: String(room._id) },
      });

      // Notify existing members (except the newly added one) of the new member.
      await notifyRoomMembers({
        roomId: room._id,
        exceptUserId: request.user,
        type: "member_joined",
        title: "New member joined",
        body: `${displayName(requester)} joined ${room.name}`,
        data: { roomId: String(room._id) },
      });

      emitToRoom(room._id, "room:update", { roomId: String(room._id) });
      emitToUser(request.user, "room:update", { roomId: String(room._id) });

      return res.json({ request });
    }

    // decline
    request.status = "declined";
    await request.save();

    await createNotification({
      userId: request.user,
      room: room._id,
      type: "request_declined",
      title: "Request declined",
      body: `Your request to join ${room.name} was declined`,
      data: { roomId: String(room._id) },
    });

    return res.json({ request });
  } catch (err) {
    console.error("handleRequest error:", err);
    return res.status(500).json({ message: "Failed to handle request" });
  }
}

// POST /api/rooms/:id/leave -----------------------------------------------
async function leaveRoom(req, res) {
  try {
    const me = req.user._id;

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (!isMember(room, me)) {
      return res.status(403).json({ message: "You are not a member of this room" });
    }

    const others = room.members.filter((m) => String(m.user) !== String(me));

    if (isAdmin(room, me)) {
      if (others.length > 0) {
        return res.status(400).json({
          message:
            "Admin cannot leave while other members remain. Transfer ownership or remove members first.",
        });
      }
      // Admin alone -> delete the room and its dependents.
      await JoinRequest.deleteMany({ room: room._id });
      await Room.deleteOne({ _id: room._id });
      return res.json({ ok: true });
    }

    room.members = others;
    await room.save();

    emitToRoom(room._id, "room:update", { roomId: String(room._id) });

    return res.json({ ok: true });
  } catch (err) {
    console.error("leaveRoom error:", err);
    return res.status(500).json({ message: "Failed to leave room" });
  }
}

// Small utilities ----------------------------------------------------------
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function displayName(user) {
  if (!user) return "Someone";
  const first = user.firstName || "";
  const last = user.lastName || "";
  const name = `${first} ${last}`.trim();
  return name || user.email || "Someone";
}

module.exports = {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
  lookupRoom,
  joinRoom,
  listRequests,
  handleRequest,
  leaveRoom,
};
