"use strict";

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");

const env = require("./config/env");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");
const transactionRoutes = require("./routes/transactions");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");

const app = express();

// ----- Core middleware -----
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// ----- Health check -----
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ----- API routers -----
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms/:roomId/transactions", transactionRoutes);
app.use("/api/rooms/:roomId/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// ----- 404 + error handling -----
app.use(notFound);
app.use(errorHandler);

// ----- HTTP + Socket.IO server -----
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
});

require("./socket").initSocket(io);

// ----- Boot -----
async function start() {
  try {
    await connectDB();
    server.listen(env.PORT, () => {
      console.log(`[server] Group Bank API listening on port ${env.PORT}`);
      console.log(`[server] CORS origin: ${env.CLIENT_URL}`);
    });
  } catch (err) {
    console.error("[server] Failed to start:", err.message);
    process.exit(1);
  }
}

start();

// Surface unexpected fatal errors instead of dying silently.
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});

module.exports = { app, server, io };
