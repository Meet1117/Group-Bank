const nodemailer = require("nodemailer");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
} = process.env;

let transporter = null;

/**
 * Lazily build (and cache) a nodemailer transport from SMTP_* env vars.
 * Returns null when SMTP is not configured so callers degrade gracefully.
 */
function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST) return null;

  const port = Number(SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    // 465 implies implicit TLS; 587/others use STARTTLS.
    secure: port === 465,
    auth:
      SMTP_USER || SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined,
  });

  return transporter;
}

/**
 * Branded HTML body for the welcome email.
 */
function welcomeHtml(firstName) {
  const name = firstName ? String(firstName) : "there";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to Group Bank</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
            <tr>
              <td style="background-image:linear-gradient(135deg,#7c3aed,#6366f1);padding:36px 32px;text-align:left;">
                <div style="font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                  Group Bank
                </div>
                <div style="margin-top:6px;font-size:14px;color:#ede9fe;">
                  Pool money. Track spend. Stay square.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="font-family:'Sora',sans-serif;margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">
                  Welcome, ${name}! 🎉
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
                  You're all set up on <strong>Group Bank</strong> — the easiest way to pool
                  money with friends and track exactly what each person spent.
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
                  Think trip cashier: collect contributions into one shared pool, log every
                  hotel, meal and fuel stop, and pick exactly who shares each expense — so a
                  friend who skipped a meal never gets charged for it.
                </p>
                <div style="margin:24px 0;padding:18px 20px;background-color:#f5f3ff;border-radius:14px;border:1px solid #ede9fe;">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#5b21b6;">
                    Get started in seconds:
                  </p>
                  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#475569;">
                    <li>Create a room (your Group Bank)</li>
                    <li>Invite friends to join with a code</li>
                    <li>Add deposits and split expenses fairly</li>
                  </ul>
                </div>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                  Happy travels,<br />
                  <span style="color:#0f172a;font-weight:600;">The Group Bank Team</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  You received this email because you signed up for Group Bank.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Send a branded welcome email to a newly created user.
 * Best-effort: never throws. No-ops (with a log) when SMTP is unconfigured.
 */
async function sendWelcomeEmail(user) {
  try {
    if (!user || !user.email) return;

    const tx = getTransporter();
    if (!tx) {
      console.log(
        `[email] SMTP not configured — skipping welcome email to ${user.email}`
      );
      return;
    }

    const firstName = user.firstName || "there";

    await tx.sendMail({
      from: FROM_EMAIL || "Group Bank <no-reply@groupbank.app>",
      to: user.email,
      subject: "Welcome to Group Bank 🎉",
      text: `Hi ${firstName}, welcome to Group Bank! Pool money with friends and track exactly what each person spent. Create a room to get started.`,
      html: welcomeHtml(firstName),
    });
  } catch (err) {
    console.warn("sendWelcomeEmail failed:", err && err.message);
  }
}

module.exports = { sendWelcomeEmail };
