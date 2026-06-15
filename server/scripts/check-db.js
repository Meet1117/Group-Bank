"use strict";

/**
 * Standalone MongoDB connectivity checker.
 *   Run from the server folder:  node scripts/check-db.js
 *
 * It decodes the *real* reason a connection fails (the normal Atlas error
 * message is generic) and tells you exactly what to fix.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGODB_DB || "groupbank";

const serverErrors = [];

async function main() {
  if (!URI) {
    console.error("✗ MONGODB_URI is missing in server/.env");
    process.exit(1);
  }

  console.log("• mongoose", mongoose.version, "| node", process.version);
  console.log("• connecting (15s timeout)…\n");

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });

  // Capture the per-server handshake error (the real cause Atlas hides).
  client.on("serverDescriptionChanged", (e) => {
    if (e.newDescription && e.newDescription.error) {
      serverErrors.push(String(e.newDescription.error.message));
    }
  });

  try {
    await client.connect();
    const db = client.db(DB);
    await db.admin().ping();
    const cols = await db.listCollections().toArray();

    console.log("✓ SUCCESS — connected to database:", db.databaseName);
    console.log(
      "✓ collections:",
      cols.length
        ? cols.map((c) => c.name).join(", ")
        : "(none yet — created on first signup)"
    );
    console.log("\nYou're good. Start the app with:  npm run dev");
    process.exit(0);
  } catch (err) {
    const blob = (serverErrors.join(" | ") + " " + String(err && err.message)).toLowerCase();
    console.error("✗ FAILED to connect.\n");

    if (/alert (internal error|number 80)|tlsv1 alert|ssl/.test(blob)) {
      console.error("Reason: Atlas rejected the TLS handshake (SSL alert 80).");
      console.error("On a shared (M0) cluster this almost ALWAYS means your current");
      console.error("IP is NOT in the cluster's allowlist (the TCP connect succeeds,");
      console.error("but Atlas drops your IP during TLS — so it looks like a TLS bug).\n");
      console.error("Fix:");
      console.error("  1. Atlas → pick the project that owns the 'MeetsMongoDB' cluster");
      console.error("  2. SECURITY → Network Access → + ADD IP ADDRESS");
      console.error("  3. ALLOW ACCESS FROM ANYWHERE  (0.0.0.0/0) → Confirm");
      console.error("  4. Wait until the entry shows Active (green), then re-run this.");
    } else if (/bad auth|authentication failed|auth error/.test(blob)) {
      console.error("Reason: wrong DB username/password in MONGODB_URI.");
    } else if (/enotfound|querysrv|getaddrinfo|dns/.test(blob)) {
      console.error("Reason: DNS can't resolve the cluster host — check the");
      console.error("cluster hostname in MONGODB_URI or your network/DNS.");
    } else if (/timed out|timeout/.test(blob)) {
      console.error("Reason: network timeout reaching Atlas. Possible IP allowlist");
      console.error("issue, or a firewall/ISP blocking outbound port 27017.");
    } else {
      console.error("Raw error:", String(err && err.message));
      if (serverErrors.length) console.error("Server errors:", serverErrors.join(" | "));
    }
    process.exit(1);
  }
}

main();
