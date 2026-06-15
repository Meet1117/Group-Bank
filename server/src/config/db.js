"use strict";

const mongoose = require("mongoose");
const env = require("./env");

/**
 * Connect to MongoDB using Mongoose.
 * Throws (and lets the caller decide what to do) if the URI is missing
 * or the connection fails — the server should not start without a DB.
 */
async function connectDB() {
  if (!env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to server/.env (see server/.env.example)."
    );
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB connected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    // Pin the database name so it appears as "groupbank" in Atlas instead
    // of the default "test" (the connection string has no db path).
    dbName: env.MONGODB_DB || "groupbank",
  });

  return mongoose.connection;
}

module.exports = connectDB;
