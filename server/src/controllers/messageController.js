const Message = require("../models/Message");
const Room = require("../models/Room");
const { emitToRoom } = require("../socket/io");
const { notifyRoomMembers } = require("../services/notify");

const SENDER_FIELDS = "_id firstName lastName avatar";

/** Ensure the requesting user is a member of the room. Returns the room or null. */
async function getRoomIfMember(roomId, userId) {
  return Room.findOne({ _id: roomId, "members.user": userId })
    .select("_id")
    .lean();
}

/**
 * GET /api/rooms/:roomId/messages?before=<ISO>&limit=30
 * Returns a page of messages oldest -> newest.
 */
async function listMessages(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await getRoomIfMember(roomId, userId);
    if (!room) {
      return res.status(403).json({ message: "Not a member of this room" });
    }

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 30;
    if (limit > 100) limit = 100;

    const filter = { room: roomId };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (!isNaN(before.getTime())) {
        filter.createdAt = { $lt: before };
      }
    }

    // Fetch newest-first for correct pagination, then reverse for display.
    const docs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", SENDER_FIELDS)
      .lean();

    const messages = docs.reverse();

    return res.json({ messages });
  } catch (err) {
    console.error("[messages] listMessages error:", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
}

/**
 * POST /api/rooms/:roomId/messages  { text }
 * Creates a message, emits message:new, notifies other members.
 */
async function sendMessage(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await getRoomIfMember(roomId, userId);
    if (!room) {
      return res.status(403).json({ message: "Not a member of this room" });
    }

    const text =
      req.body && typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Message text is required" });
    }

    let message = await Message.create({
      room: roomId,
      sender: userId,
      text,
      readBy: [{ user: userId, readAt: new Date() }],
    });

    message = await message.populate("sender", SENDER_FIELDS);
    const plain = message.toObject();

    emitToRoom(String(roomId), "message:new", { message: plain });

    notifyRoomMembers({
      roomId: String(roomId),
      exceptUserId: String(userId),
      type: "chat",
      title: "New message",
      body: text.length > 80 ? text.slice(0, 77) + "..." : text,
      data: { roomId: String(roomId) },
    }).catch((err) =>
      console.warn("[messages] chat notify failed:", err && err.message)
    );

    return res.status(201).json({ message: plain });
  } catch (err) {
    console.error("[messages] sendMessage error:", err);
    return res.status(500).json({ message: "Failed to send message" });
  }
}

/**
 * POST /api/rooms/:roomId/messages/read
 * Marks all unread-by-me room messages as read and emits message:seen.
 */
async function markRead(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await getRoomIfMember(roomId, userId);
    if (!room) {
      return res.status(403).json({ message: "Not a member of this room" });
    }

    const unread = await Message.find({
      room: roomId,
      "readBy.user": { $ne: userId },
    })
      .select("_id")
      .lean();

    if (unread.length === 0) {
      return res.json({ ok: true });
    }

    const ids = unread.map((m) => m._id);
    const messageIds = ids.map((id) => String(id));

    await Message.updateMany(
      { _id: { $in: ids } },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );

    emitToRoom(String(roomId), "message:seen", {
      roomId: String(roomId),
      userId: String(userId),
      messageIds,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[messages] markRead error:", err);
    return res.status(500).json({ message: "Failed to mark messages read" });
  }
}

/**
 * DELETE /api/rooms/:roomId/messages/:messageId
 * Only the sender can delete. Removes from DB and notifies all room members.
 */
async function deleteMessage(req, res) {
  try {
    const { roomId, messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, room: roomId }).lean();
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }
    if (String(message.sender) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await Message.deleteOne({ _id: messageId });

    emitToRoom(String(roomId), "message:deleted", {
      messageId: String(messageId),
      roomId: String(roomId),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[messages] deleteMessage error:", err);
    return res.status(500).json({ message: "Failed to delete message" });
  }
}

module.exports = { listMessages, sendMessage, markRead, deleteMessage };
