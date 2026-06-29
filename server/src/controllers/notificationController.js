const Notification = require("../models/Notification");

/**
 * GET /api/notifications
 * My notifications, newest first, limited to 100, with unread count.
 */
async function list(req, res) {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[notifications] list error:", err);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
}

/**
 * POST /api/notifications/read-all
 * Mark all of my notifications as read.
 */
async function readAll(req, res) {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("[notifications] readAll error:", err);
    return res
      .status(500)
      .json({ message: "Failed to mark notifications read" });
  }
}

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read (only if it belongs to me).
 */
async function readOne(req, res) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    await Notification.updateOne(
      { _id: id, user: userId },
      { $set: { read: true } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("[notifications] readOne error:", err);
    return res
      .status(500)
      .json({ message: "Failed to mark notification read" });
  }
}

module.exports = { list, readAll, readOne };
