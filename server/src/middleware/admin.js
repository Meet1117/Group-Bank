"use strict";

const env = require("../config/env");

/**
 * Helper: is this user object the configured super-admin?
 */
function isSuperAdmin(user) {
  return (
    !!user &&
    !!user.email &&
    String(user.email).toLowerCase() === env.SUPER_ADMIN_EMAIL
  );
}

/**
 * Gate that only allows the configured super-admin through.
 * Must run AFTER the `auth` middleware (which sets req.user).
 */
function superAdmin(req, res, next) {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: "Admin access only" });
  }
  return next();
}

module.exports = { superAdmin, isSuperAdmin };
