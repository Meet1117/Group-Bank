const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Room = require("../models/Room");
const { notifyRoomMembers } = require("../services/notify");
const {
  setIO,
  emitToRoom,
  addPresence,
  removePresence,
} = require("./io");

const SENDER_FIELDS = "_id firstName lastName avatar";

/**
 * Initialize Socket.io: auth, channel joins, presence, and chat events.
 * @param {import("socket.io").Server} io
 */
function initSocket(io) {
  setIO(io);

  // Authenticate every socket via the JWT in handshake auth.
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake &&
        socket.handshake.auth &&
        socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) return next(new Error("Invalid token"));
      socket.userId = String(decoded.id);
      return next();
    } catch (err) {
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    // Personal channel for direct user emits.
    socket.join("user:" + userId);

    // Join every room the user is a member of.
    let roomIds = [];
    try {
      const rooms = await Room.find({ "members.user": userId })
        .select("_id")
        .lean();
      roomIds = rooms.map((r) => String(r._id));
      roomIds.forEach((rid) => socket.join("room:" + rid));
    } catch (err) {
      console.warn("[socket] failed to load user rooms:", err && err.message);
    }

    // Presence: announce online to all of the user's rooms if this is
    // their first active connection.
    const becameOnline = addPresence(userId);
    if (becameOnline) {
      roomIds.forEach((rid) => {
        emitToRoom(rid, "presence:update", { userId, online: true });
      });
    }

    // Explicitly subscribe to an additional room channel.
    socket.on("room:subscribe", (payload) => {
      const roomId = payload && payload.roomId;
      if (roomId) socket.join("room:" + String(roomId));
    });

    // Real-time message send with ack returning the saved message.
    socket.on("message:send", async (payload, ack) => {
      try {
        const roomId = payload && payload.roomId;
        const text = payload && typeof payload.text === "string"
          ? payload.text.trim()
          : "";
        if (!roomId || !text) {
          if (typeof ack === "function") {
            ack({ ok: false, error: "Invalid message" });
          }
          return;
        }

        // Verify membership before allowing a send.
        const room = await Room.findOne({
          _id: roomId,
          "members.user": userId,
        })
          .select("_id")
          .lean();
        if (!room) {
          if (typeof ack === "function") {
            ack({ ok: false, error: "Not a member of this room" });
          }
          return;
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
          exceptUserId: userId,
          type: "chat",
          title: "New message",
          body: text.length > 80 ? text.slice(0, 77) + "..." : text,
          data: { roomId: String(roomId) },
        }).catch((err) =>
          console.warn("[socket] chat notify failed:", err && err.message)
        );

        if (typeof ack === "function") {
          ack({ ok: true, message: plain });
        }
      } catch (err) {
        console.warn("[socket] message:send failed:", err && err.message);
        if (typeof ack === "function") {
          ack({ ok: false, error: "Failed to send message" });
        }
      }
    });

    // Mark all unread-by-me messages in a room as read.
    socket.on("message:read", async (payload) => {
      try {
        const roomId = payload && payload.roomId;
        if (!roomId) return;

        const unread = await Message.find({
          room: roomId,
          "readBy.user": { $ne: userId },
        })
          .select("_id")
          .lean();

        if (unread.length === 0) return;

        const messageIds = unread.map((m) => String(m._id));

        await Message.updateMany(
          { _id: { $in: unread.map((m) => m._id) } },
          { $push: { readBy: { user: userId, readAt: new Date() } } }
        );

        emitToRoom(String(roomId), "message:seen", {
          roomId: String(roomId),
          userId,
          messageIds,
        });
      } catch (err) {
        console.warn("[socket] message:read failed:", err && err.message);
      }
    });

    // Typing indicators (broadcast to room, excluding self).
    socket.on("typing", async (payload) => {
      const roomId = payload && payload.roomId;
      if (!roomId) return;
      let user = { _id: userId, firstName: "" };
      if (payload && payload.user && payload.user.firstName) {
        user = { _id: userId, firstName: payload.user.firstName };
      }
      socket.to("room:" + String(roomId)).emit("typing", {
        roomId: String(roomId),
        user,
      });
    });

    socket.on("stop-typing", (payload) => {
      const roomId = payload && payload.roomId;
      if (!roomId) return;
      socket.to("room:" + String(roomId)).emit("stop-typing", {
        roomId: String(roomId),
        userId,
      });
    });

    socket.on("disconnect", () => {
      const becameOffline = removePresence(userId);
      if (becameOffline) {
        roomIds.forEach((rid) => {
          emitToRoom(rid, "presence:update", { userId, online: false });
        });
      }
    });
  });
}

module.exports = { initSocket };
