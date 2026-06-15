const Notification = require("../models/Notification");
const Room = require("../models/Room");
const { emitToUser } = require("../socket/io");
const { sendPush } = require("./push");

/**
 * Create a notification for a single user, emit it over socket, and
 * fire a best-effort web push.
 * @param {{userId:string, room?:string, type:string, title:string, body?:string, data?:object}} args
 * @returns {Promise<object>} the saved notification (lean object)
 */
async function createNotification({ userId, room, type, title, body, data }) {
  const notification = await Notification.create({
    user: userId,
    room: room || undefined,
    type,
    title,
    body: body || "",
    data: data || {},
    read: false,
  });

  const plain = notification.toObject();

  try {
    emitToUser(String(userId), "notification:new", { notification: plain });
  } catch (err) {
    console.warn("[notify] emit failed:", err && err.message);
  }

  // Best-effort push (never throws).
  sendPush(String(userId), {
    title: title || "Group Bank",
    body: body || "",
    data: data || {},
  });

  return plain;
}

/**
 * Notify every member of a room except one user.
 * @param {{roomId:string, exceptUserId?:string, type:string, title:string, body?:string, data?:object}} args
 */
async function notifyRoomMembers({ roomId, exceptUserId, type, title, body, data }) {
  const room = await Room.findById(roomId).select("members").lean();
  if (!room || !Array.isArray(room.members)) return;

  const except = exceptUserId ? String(exceptUserId) : null;
  const seen = new Set();

  await Promise.all(
    room.members.map((m) => {
      const memberId = m && m.user ? String(m.user) : null;
      if (!memberId) return Promise.resolve();
      if (except && memberId === except) return Promise.resolve();
      if (seen.has(memberId)) return Promise.resolve();
      seen.add(memberId);
      return createNotification({
        userId: memberId,
        room: roomId,
        type,
        title,
        body,
        data,
      }).catch((err) => {
        console.warn("[notify] member notify failed:", err && err.message);
      });
    })
  );
}

module.exports = { createNotification, notifyRoomMembers };
