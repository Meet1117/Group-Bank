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
      index: true,
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

module.exports =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
