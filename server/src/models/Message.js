const mongoose = require("mongoose");

const ReadBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    readBy: {
      type: [ReadBySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index covers paginated message listing (most common query).
MessageSchema.index({ room: 1, createdAt: -1 });
// Covers the markRead query: find unread messages by room + user.
MessageSchema.index({ room: 1, "readBy.user": 1 });

module.exports =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
