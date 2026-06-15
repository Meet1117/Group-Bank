const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema(
  {
    type: Object,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    avatar: {
      type: String,
    },
    pushSubscriptions: [
      {
        type: Object,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
