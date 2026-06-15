"use strict";

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

/**
 * Authentication middleware.
 * Expects an "Authorization: Bearer <token>" header containing a JWT
 * signed with { id }. On success it loads the user and sets BOTH
 * req.userId (string id) and req.user (the Mongoose user document) so
 * every controller works regardless of which it reads. Responds 401 otherwise.
 */
async function auth(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization || "";

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    if (user.blocked) {
      return res
        .status(403)
        .json({ message: "Your account has been blocked by the admin." });
    }
    req.userId = String(user._id);
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
}

module.exports = auth;
