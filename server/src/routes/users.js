const express = require("express");

const auth = require("../middleware/auth");
const {
  me,
  pushSubscribe,
  pushUnsubscribe,
} = require("../controllers/userController");

const router = express.Router();

// Protected: current user profile.
router.get("/me", auth, me);

// Protected: register / remove a web-push subscription.
router.post("/push", auth, pushSubscribe);
router.post("/push/unsubscribe", auth, pushUnsubscribe);

module.exports = router;
