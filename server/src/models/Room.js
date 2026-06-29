const mongoose = require("mongoose");

const CurrencySchema = new mongoose.Schema(
  {
    code: { type: String },
    symbol: { type: String },
    name: { type: String },
  },
  { _id: false }
);

const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    currency: {
      type: CurrencySchema,
      default: () => ({}),
    },
    code: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    joinType: {
      type: String,
      enum: ["open", "invite"],
      default: "open",
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [MemberSchema],
      default: [],
    },
    // Members (besides the admin) the admin allows to record deposits & expenses.
    payers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index covers both "find by member" and "sort by updatedAt" in listRooms.
RoomSchema.index({ "members.user": 1, updatedAt: -1 });
RoomSchema.index({ admin: 1 });

module.exports = mongoose.models.Room || mongoose.model("Room", RoomSchema);
