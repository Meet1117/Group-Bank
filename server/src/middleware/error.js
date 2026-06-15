"use strict";

/**
 * 404 handler — for any route that did not match.
 */
function notFound(req, res, next) {
  res.status(404).json({ message: `Not found - ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler. Sends { message } with the error's status
 * (defaults to 500). Logs the stack in non-production environments.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error("[error]", err);
  } else if (status >= 500) {
    console.error("[error]", err.message);
  }

  res.status(status).json({
    message: err.message || "Internal Server Error",
  });
}

module.exports = { notFound, errorHandler };
