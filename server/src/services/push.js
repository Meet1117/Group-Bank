const webpush = require("web-push");
const User = require("../models/User");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@groupbank.app";

let pushEnabled = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
  } catch (err) {
    pushEnabled = false;
    console.warn("[push] Failed to configure web-push VAPID:", err.message);
  }
} else {
  console.log("[push] VAPID keys not set; web push disabled.");
}

/**
 * Send a web-push notification to all of a user's subscriptions.
 * Best-effort: never throws. Removes stale (404/410) subscriptions.
 * @param {string} userId
 * @param {{title:string, body:string, data?:object}} payload
 */
async function sendPush(userId, payload) {
  if (!pushEnabled) return;
  try {
    const user = await User.findById(userId).select("pushSubscriptions");
    if (!user || !Array.isArray(user.pushSubscriptions) || user.pushSubscriptions.length === 0) {
      return;
    }

    const body = JSON.stringify(payload || {});
    const stale = [];

    await Promise.all(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, body);
        } catch (err) {
          const status = err && (err.statusCode || err.status);
          if (status === 404 || status === 410) {
            const endpoint = sub && sub.endpoint;
            if (endpoint) stale.push(endpoint);
          } else {
            console.warn("[push] sendNotification error:", err && err.message);
          }
        }
      })
    );

    if (stale.length > 0) {
      user.pushSubscriptions = user.pushSubscriptions.filter(
        (sub) => !stale.includes(sub && sub.endpoint)
      );
      await user.save();
    }
  } catch (err) {
    console.warn("[push] sendPush failed:", err && err.message);
  }
}

module.exports = { sendPush };
