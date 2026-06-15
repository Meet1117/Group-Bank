"use strict";

/**
 * Module-scope holder for the Socket.IO server instance plus a small
 * presence registry. Keeping this in its own module avoids circular
 * imports between the HTTP layer, services, and the socket handlers.
 */

let io = null;

// Map<userId(string), connectionCount(number)>
const presence = new Map();

/**
 * Store the Socket.IO server instance.
 * @param {import("socket.io").Server} server
 */
function setIO(server) {
  io = server;
}

/**
 * Retrieve the Socket.IO server instance (may be null before init).
 * @returns {import("socket.io").Server|null}
 */
function getIO() {
  return io;
}

/**
 * Emit an event to everyone in a room channel.
 * @param {string} roomId
 * @param {string} event
 * @param {*} payload
 */
function emitToRoom(roomId, event, payload) {
  if (!io || roomId == null) return;
  io.to("room:" + String(roomId)).emit(event, payload);
}

/**
 * Emit an event to all sockets belonging to a user.
 * @param {string} userId
 * @param {string} event
 * @param {*} payload
 */
function emitToUser(userId, event, payload) {
  if (!io || userId == null) return;
  io.to("user:" + String(userId)).emit(event, payload);
}

/**
 * Register a new connection for a user.
 * @param {string} userId
 * @returns {boolean} true if this is the user's FIRST active connection.
 */
function addPresence(userId) {
  const key = String(userId);
  const current = presence.get(key) || 0;
  presence.set(key, current + 1);
  return current === 0;
}

/**
 * Remove a connection for a user.
 * @param {string} userId
 * @returns {boolean} true if this was the user's LAST active connection.
 */
function removePresence(userId) {
  const key = String(userId);
  const current = presence.get(key) || 0;
  if (current <= 1) {
    presence.delete(key);
    return current === 1;
  }
  presence.set(key, current - 1);
  return false;
}

/**
 * Whether a user currently has at least one active connection.
 * @param {string} userId
 * @returns {boolean}
 */
function isOnline(userId) {
  return (presence.get(String(userId)) || 0) > 0;
}

module.exports = {
  setIO,
  getIO,
  emitToRoom,
  emitToUser,
  addPresence,
  removePresence,
  isOnline,
};
