const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    type: {
      type: String,
    },
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    data: {
      type: Object,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Covers list query (newest first per user).
NotificationSchema.index({ user: 1, createdAt: -1 });
// Covers unread count query.
NotificationSchema.index({ user: 1, read: 1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
