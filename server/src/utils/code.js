"use strict";

const crypto = require("crypto");

// Unambiguous alphabet — excludes easily confused chars (0/O, 1/I, etc.).
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a cryptographically-random room join code.
 * @param {number} [len=6] desired length of the code.
 * @returns {string} uppercase code of the requested length.
 */
function generateRoomCode(len = 6) {
  let code = "";
  for (let i = 0; i < len; i += 1) {
    code += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return code;
}

module.exports = { generateRoomCode };
