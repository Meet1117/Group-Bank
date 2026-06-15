"use strict";

const User = require("../models/User");
const Room = require("../models/Room");
const Transaction = require("../models/Transaction");
const Message = require("../models/Message");
const JoinRequest = require("../models/JoinRequest");
const Notification = require("../models/Notification");
const { computeBalances } = require("../utils/balances");
const { isSuperAdmin } = require("../middleware/admin");
const { emitToRoom, emitToUser } = require("../socket/io");

const USER_FIELDS = "_id firstName lastName email avatar";

function adminUserView(u, roomCount) {
  return {
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    avatar: u.avatar,
    blocked: !!u.blocked,
    isAdmin: isSuperAdmin(u),
    createdAt: u.createdAt,
    roomCount: typeof roomCount === "number" ? roomCount : undefined,
  };
}

// GET /api/admin/stats -----------------------------------------------------
async function stats(req, res) {
  try {
    const [userCount, blockedCount, roomCount, txCount, msgCount, txAgg] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ blocked: true }),
        Room.countDocuments({}),
        Transaction.countDocuments({}),
        Message.countDocuments({}),
        Transaction.aggregate([
          {
            $group: {
              _id: "$type",
              total: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

    let totalPooled = 0;
    let totalSpent = 0;
    for (const row of txAgg) {
      if (row._id === "deposit") totalPooled = row.total || 0;
      else if (row._id === "expense") totalSpent = row.total || 0;
    }

    return res.json({
      stats: {
        users: userCount,
        blockedUsers: blockedCount,
        rooms: roomCount,
        transactions: txCount,
        messages: msgCount,
        totalPooled: Math.round(totalPooled * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        netHeld: Math.round((totalPooled - totalSpent) * 100) / 100,
      },
    });
  } catch (err) {
    console.error("admin.stats error:", err);
    return res.status(500).json({ message: "Failed to load stats" });
  }
}

// GET /api/admin/users -----------------------------------------------------
async function listUsers(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { email: new RegExp(q, "i") },
            { firstName: new RegExp(q, "i") },
            { lastName: new RegExp(q, "i") },
          ],
        }
      : {};

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    // Count rooms each user belongs to (one grouped query).
    const counts = await Room.aggregate([
      { $unwind: "$members" },
      { $group: { _id: "$members.user", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const out = users.map((u) =>
      adminUserView(u, countMap.get(String(u._id)) || 0)
    );
    return res.json({ users: out });
  } catch (err) {
    console.error("admin.listUsers error:", err);
    return res.status(500).json({ message: "Failed to load users" });
  }
}

// POST /api/admin/users/:id/block  { blocked: true|false } -----------------
async function setBlock(req, res) {
  try {
    const { blocked } = req.body || {};
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });

    if (isSuperAdmin(target)) {
      return res.status(400).json({ message: "You cannot block the admin account" });
    }

    target.blocked = !!blocked;
    await target.save();

    // If blocking, kick any live sockets / force re-auth on next request.
    if (target.blocked) {
      emitToUser(String(target._id), "account:blocked", {});
    }

    return res.json({ user: adminUserView(target) });
  } catch (err) {
    console.error("admin.setBlock error:", err);
    return res.status(500).json({ message: "Failed to update user" });
  }
}

// DELETE /api/admin/users/:id ---------------------------------------------
async function deleteUser(req, res) {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (isSuperAdmin(target)) {
      return res.status(400).json({ message: "You cannot delete the admin account" });
    }

    const uid = target._id;

    // Remove the user from any rooms they belong to.
    await Room.updateMany(
      { "members.user": uid },
      { $pull: { members: { user: uid } } }
    );
    // Delete rooms where they were the sole admin and now have no members,
    // plus their join requests and notifications.
    await JoinRequest.deleteMany({ user: uid });
    await Notification.deleteMany({ user: uid });
    // Clean up empty rooms this user administered.
    await Room.deleteMany({ admin: uid, "members.0": { $exists: false } });

    await User.deleteOne({ _id: uid });

    return res.json({ ok: true });
  } catch (err) {
    console.error("admin.deleteUser error:", err);
    return res.status(500).json({ message: "Failed to delete user" });
  }
}

// GET /api/admin/rooms -----------------------------------------------------
async function listRooms(req, res) {
  try {
    const rooms = await Room.find({})
      .populate("admin", USER_FIELDS)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const roomIds = rooms.map((r) => r._id);
    const tx = await Transaction.find({ room: { $in: roomIds } })
      .select("room type totalAmount")
      .lean();

    const sums = new Map();
    for (const t of tx) {
      const key = String(t.room);
      if (!sums.has(key)) sums.set(key, { dep: 0, sp: 0, n: 0 });
      const b = sums.get(key);
      b.n += 1;
      if (t.type === "deposit") b.dep += Number(t.totalAmount) || 0;
      else b.sp += Number(t.totalAmount) || 0;
    }

    const out = rooms.map((r) => {
      const b = sums.get(String(r._id)) || { dep: 0, sp: 0, n: 0 };
      return {
        _id: r._id,
        name: r.name,
        code: r.code,
        currency: r.currency,
        joinType: r.joinType,
        admin: r.admin,
        memberCount: Array.isArray(r.members) ? r.members.length : 0,
        transactions: b.n,
        bankBalance: Math.round((b.dep - b.sp) * 100) / 100,
        createdAt: r.createdAt,
      };
    });
    return res.json({ rooms: out });
  } catch (err) {
    console.error("admin.listRooms error:", err);
    return res.status(500).json({ message: "Failed to load rooms" });
  }
}

// GET /api/admin/rooms/:id -------------------------------------------------
async function getRoom(req, res) {
  try {
    const room = await Room.findById(req.params.id)
      .populate("admin", USER_FIELDS)
      .populate("members.user", USER_FIELDS)
      .lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const transactions = await Transaction.find({ room: room._id })
      .populate("createdBy", USER_FIELDS)
      .populate("allocations.user", USER_FIELDS)
      .populate("splitAmong.user", USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const memberUsers = (room.members || [])
      .map((m) => m.user)
      .filter((u) => u && u._id);
    const balances = computeBalances(transactions, memberUsers);

    const messageCount = await Message.countDocuments({ room: room._id });
    const pendingRequests = await JoinRequest.countDocuments({
      room: room._id,
      status: "pending",
    });

    return res.json({
      room,
      balances,
      transactions,
      counts: { messages: messageCount, pendingRequests },
    });
  } catch (err) {
    console.error("admin.getRoom error:", err);
    return res.status(500).json({ message: "Failed to load room" });
  }
}

// GET /api/admin/rooms/:id/messages ---------------------------------------
async function getRoomMessages(req, res) {
  try {
    const messages = await Message.find({ room: req.params.id })
      .populate("sender", USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("admin.getRoomMessages error:", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
}

// DELETE /api/admin/rooms/:id ----------------------------------------------
async function deleteRoom(req, res) {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    await Promise.all([
      Transaction.deleteMany({ room: room._id }),
      Message.deleteMany({ room: room._id }),
      JoinRequest.deleteMany({ room: room._id }),
    ]);
    await Room.deleteOne({ _id: room._id });

    emitToRoom(String(room._id), "room:update", { roomId: String(room._id) });

    return res.json({ ok: true });
  } catch (err) {
    console.error("admin.deleteRoom error:", err);
    return res.status(500).json({ message: "Failed to delete room" });
  }
}

module.exports = {
  stats,
  listUsers,
  setBlock,
  deleteUser,
  listRooms,
  getRoom,
  getRoomMessages,
  deleteRoom,
};
