const express = require("express");
const auth = require("../middleware/auth");
const {
  listMessages,
  sendMessage,
  markRead,
  deleteMessage,
} = require("../controllers/messageController");

// mergeParams so :roomId from the parent router is available here.
const router = express.Router({ mergeParams: true });

router.use(auth);

router.get("/", listMessages);
router.post("/", sendMessage);
router.post("/read", markRead);
router.delete("/:messageId", deleteMessage);

module.exports = router;
