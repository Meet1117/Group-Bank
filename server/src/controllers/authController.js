const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const { sendWelcomeEmail } = require("../services/email");
const { createNotification } = require("../services/notify");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
 * Sign a 30-day JWT containing the user id.
 */
function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });
}

/**
 * POST /api/auth/google
 * Body: { credential } (Google ID token)
 * Verifies the token, upserts the User, returns { token, user }.
 */
async function googleLogin(req, res) {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ message: "Missing credential" });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const {
      sub,
      email,
      given_name: givenName,
      family_name: familyName,
      picture,
    } = payload;

    const normalizedEmail = String(email).toLowerCase();

    // Find an existing user by googleId or email.
    let user = await User.findOne({
      $or: [{ googleId: sub }, { email: normalizedEmail }],
    });

    let isNew = false;

    if (user) {
      // Keep the account in sync with the latest Google profile data.
      let changed = false;
      if (user.googleId !== sub) {
        user.googleId = sub;
        changed = true;
      }
      if (user.email !== normalizedEmail) {
        user.email = normalizedEmail;
        changed = true;
      }
      if (givenName && user.firstName !== givenName) {
        user.firstName = givenName;
        changed = true;
      }
      if (familyName && user.lastName !== familyName) {
        user.lastName = familyName;
        changed = true;
      }
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    } else {
      isNew = true;
      user = await User.create({
        googleId: sub,
        email: normalizedEmail,
        firstName: givenName || "",
        lastName: familyName || "",
        avatar: picture || "",
      });
    }

    if (isNew) {
      // Best-effort welcome side-effects; never block login.
      sendWelcomeEmail(user).catch((err) =>
        console.warn("sendWelcomeEmail failed:", err && err.message)
      );

      try {
        await createNotification({
          userId: user._id,
          type: "welcome",
          title: "Welcome to Group Bank",
          body: `Hi ${user.firstName || "there"}, welcome to Group Bank! Create or join a room to start pooling money with friends.`,
        });
      } catch (err) {
        console.warn("welcome notification failed:", err && err.message);
      }
    }

    const token = signToken(user._id);

    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("googleLogin error:", err && err.message);
    return res.status(401).json({ message: "Authentication failed" });
  }
}

/**
 * GET /api/auth/me
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
    console.error("auth.me error:", err && err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { googleLogin, me, publicUser };
