const mongoose = require("mongoose");

const AllocationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number },
  },
  { _id: false }
);

const SplitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number },
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "expense"],
      required: true,
    },
    title: {
      type: String,
    },
    category: {
      type: String,
    },
    note: {
      type: String,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    allocations: {
      type: [AllocationSchema],
      default: [],
    },
    splitAmong: {
      type: [SplitSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound covers all per-room queries; leftmost key also covers room-only lookups.
TransactionSchema.index({ room: 1, createdAt: -1 });
// Covers type-filtered sums (deposit/expense aggregation in listRooms).
TransactionSchema.index({ room: 1, type: 1 });

module.exports =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
