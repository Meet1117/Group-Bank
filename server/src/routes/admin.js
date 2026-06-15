const express = require("express");
const auth = require("../middleware/auth");
const { superAdmin } = require("../middleware/admin");
const {
  stats,
  listUsers,
  setBlock,
  deleteUser,
  listRooms,
  getRoom,
  getRoomMessages,
  deleteRoom,
} = require("../controllers/adminController");

const router = express.Router();

// Every admin route requires auth + super-admin.
router.use(auth, superAdmin);

router.get("/stats", stats);

router.get("/users", listUsers);
router.post("/users/:id/block", setBlock);
router.delete("/users/:id", deleteUser);

router.get("/rooms", listRooms);
router.get("/rooms/:id", getRoom);
router.get("/rooms/:id/messages", getRoomMessages);
router.delete("/rooms/:id", deleteRoom);

module.exports = router;
