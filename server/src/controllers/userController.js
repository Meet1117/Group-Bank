const User = require("../models/User");

/**
 * Shape the User document into the public client-facing object.
 */
function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
  };
}

/**
 * GET /api/users/me
 * Returns the authenticated user.
 */
async function me(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("users.me error:", err && err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/users/push
 * Body: { subscription } (web-push PushSubscription)
 * Stores the subscription on the user, de-duplicated by endpoint.
 */
async function pushSubscribe(req, res) {
  try {
    const { subscription } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = Array.isArray(user.pushSubscriptions)
      ? user.pushSubscriptions
      : [];

    const alreadyPresent = existing.some(
      (s) => s && s.endpoint === subscription.endpoint
    );

    if (!alreadyPresent) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("users.pushSubscribe error:", err && err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/users/push/unsubscribe
 * Body: { endpoint }
 * Removes a stored web-push subscription by endpoint.
 */
async function pushUnsubscribe(req, res) {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ message: "Missing endpoint" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.pushSubscriptions = (user.pushSubscriptions || []).filter(
      (s) => s && s.endpoint !== endpoint
    );
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("users.pushUnsubscribe error:", err && err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { me, pushSubscribe, pushUnsubscribe, publicUser };
