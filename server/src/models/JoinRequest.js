const mongoose = require("mongoose");

const JoinRequestSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ room: 1, user: 1 });

module.exports =
  mongoose.models.JoinRequest ||
  mongoose.model("JoinRequest", JoinRequestSchema);
