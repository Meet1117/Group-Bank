const express = require("express");

const auth = require("../middleware/auth");
const { googleLogin, me } = require("../controllers/authController");

const router = express.Router();

// Public: exchange a Google ID token for an app JWT.
router.post("/google", googleLogin);

// Protected: hydrate the current user from the JWT.
router.get("/me", auth, me);

module.exports = router;
