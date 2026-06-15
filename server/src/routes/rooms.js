const express = require("express");
const auth = require("../middleware/auth");
const {
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
  lookupRoom,
  joinRoom,
  listRequests,
  handleRequest,
  leaveRoom,
} = require("../controllers/roomController");

const router = express.Router();

// All room routes require authentication.
router.use(auth);

// Collection.
router.post("/", createRoom);
router.get("/", listRooms);

// Literal /join + /lookup must be declared before the /:id wildcard.
router.post("/join", joinRoom);
router.get("/lookup/:code", lookupRoom);

// Single room.
router.get("/:id", getRoom);
router.patch("/:id", updateRoom);

// Join request management (admin only, enforced in controller).
router.get("/:id/requests", listRequests);
router.post("/:id/requests/:reqId", handleRequest);

// Leave a room.
router.post("/:id/leave", leaveRoom);

module.exports = router;
