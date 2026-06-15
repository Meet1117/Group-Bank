"use strict";

/**
 * Centralized environment configuration.
 * Reads from process.env with sensible defaults so the app can boot
 * for local development even when some optional vars are unset.
 */
const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,

  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "",

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",

  // SMTP / email (optional — email features skip gracefully if unset)
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  FROM_EMAIL: process.env.FROM_EMAIL || "Group Bank <no-reply@groupbank.app>",

  // Web Push / VAPID (optional — push features skip gracefully if unset)
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@groupbank.app",
};

module.exports = env;
