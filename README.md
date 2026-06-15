# 💸 Group Bank

Pool money with friends and **split shared expenses fairly**. Think trip cashier:
five friends each put ₹5,000 into a pool (₹25,000), one person spends on hotel /
food / fuel, and **for every expense you pick exactly who shares it** — so the
friend who skipped dinner is never charged for it. At any moment everyone sees the
total balance, their own contribution, what they've spent, and who owes what.

Built with the **MERN stack** + **Socket.io** for real-time chat & live updates.

---

## ✨ Features

- **Google login only** (one tap, no passwords) — uses your real first/last name.
- **Rooms = Group Banks.** Create a room with a name, currency, and join type:
  - **Anyone with the code** → enter code, join instantly.
  - **Invite only** → entering the code sends a request to the admin, who can **Accept / Decline**.
- **Cashier deposits.** The admin adds money and allocates it per member — with a
  **"Split equally"** button (₹25k ÷ 5 → ₹5k each in one tap).
- **Fair expenses.** Each expense (Food, Hotel, Fuel, …) lets you choose **which
  members share it** and split **equally or custom**. Non-participants pay nothing.
- **Live balances & history.** Total bank balance, your contribution, your spend,
  net per person ("settle up"), and a full transaction feed — updated in real time.
- **Real-time group chat** like WhatsApp: typing indicators, **"seen" ticks**
  (blue when everyone has read), online presence, date separators.
- **Notifications** — in-app (live) + browser **Web Push** + a **welcome email** on
  signup. Triggers: member joined, join request, request accepted/declined, deposit,
  expense, and new chat messages.
- **Mobile-first, polished UI** — responsive, Plus Jakarta Sans + Sora fonts, violet
  gradient theme, Framer Motion micro-animations, skeleton loaders everywhere.

---

## 🧱 Tech stack

| Layer | Tech |
|------|------|
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion, React Router, `@react-oauth/google`, socket.io-client, axios, react-hot-toast, lucide-react |
| Backend | Node + Express, Socket.io, Mongoose, google-auth-library, JWT, nodemailer, web-push |
| Database | MongoDB (Atlas) |

```
Group Bank/
├── package.json        ← root runner (npm run dev starts both)
├── client/             ← React + Vite frontend (port 5173)
└── server/             ← Express + Socket.io API   (port 5050)
```

---

## 🚀 Getting started

> Dependencies are already installed and `.env` files are already created with your
> MongoDB string + generated JWT/VAPID keys. You only need to do **Step 1 and 2**.

### 1. Whitelist your IP in MongoDB Atlas  *(required — currently blocking the DB)*
The server can't reach your cluster until your IP is allowed:
1. Go to **MongoDB Atlas → Network Access → Add IP Address**.
2. Choose **"Allow Access from Anywhere"** (`0.0.0.0/0`) for development, or **"Add Current IP Address"**.
3. Save and wait ~1 minute.

### 2. Create your Google OAuth Client ID  *(required for login)*
1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create OAuth client ID → Web application**.
2. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   http://localhost:3000
   http://127.0.0.1:5173
   ```
3. **Authorized redirect URIs:**
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```
4. On the **OAuth consent screen** add scopes `email`, `profile`, `openid`, and add your email under **Test users**.
5. Copy the **Client ID** and paste it into **both**:
   - `server/.env` → `GOOGLE_CLIENT_ID=...`
   - `client/.env` → `VITE_GOOGLE_CLIENT_ID=...`

   > The **Client Secret is not needed** — the backend verifies Google's ID token using only the Client ID.

### 3. Run it
From the **project root**:
```bash
npm install            # installs the root runner (concurrently) — one time
npm run dev            # starts BOTH server (5050) and client (5173)
```
Then open **http://localhost:5173**.

Run them separately if you prefer:
```bash
npm run dev:server     # API on http://localhost:5050
npm run dev:client     # web on http://localhost:5173
```

---

## ⚙️ Environment variables

**`server/.env`** (already created)
| Key | Notes |
|-----|-------|
| `MONGODB_URI` | ✅ your Atlas string (set) |
| `JWT_SECRET` | ✅ generated |
| `GOOGLE_CLIENT_ID` | ⬅️ **you add this** |
| `CLIENT_URL` | `http://localhost:5173` |
| `SMTP_HOST/PORT/USER/PASS`, `FROM_EMAIL` | optional — welcome email (Gmail = App Password). Left blank = emails skipped silently |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | ✅ generated (web push) |

**`client/.env`** (already created)
| Key | Notes |
|-----|-------|
| `VITE_API_URL` | `/api` (proxied to the server in dev) |
| `VITE_SOCKET_URL` | `http://localhost:5050` |
| `VITE_GOOGLE_CLIENT_ID` | ⬅️ **you add this** (same value as server) |
| `VITE_VAPID_PUBLIC_KEY` | ✅ set (matches server) |

---

## 🧮 How the fair-split math works

- **Deposit** → records how much *each member contributed* (`allocations`).
- **Expense** → records *who shares it and their share* (`splitAmong`). Skip a member and they owe nothing for that expense.
- For each member: **net = contributed − their expense shares**.
  - `net > 0` → the pool owes them money back.
  - `net < 0` → they owe the pool.
- **Bank balance = total deposited − total spent.**

This is exactly the "B didn't eat, so B isn't charged for food" problem, solved.

---

## ☁️ Deploy for free (no app store needed)

This is a **web app / installable PWA** — works on Android & iOS via the browser
("Add to Home Screen"), no Play Store / App Store required.

| Piece | Free host |
|-------|-----------|
| Frontend (`client`) | **Vercel** or **Netlify** (build: `npm run build`, output: `client/dist`) |
| Backend (`server`) | **Render** or **Railway** (free web service) |
| Database | **MongoDB Atlas** free tier (already used) |

After deploying, update: `server/.env` `CLIENT_URL` → your frontend URL,
`client/.env` `VITE_API_URL`/`VITE_SOCKET_URL` → your backend URL, and add the
production domain to the Google OAuth **origins/redirect URIs**.

---

## 🛠️ Troubleshooting

- **`Could not connect to any servers in your MongoDB Atlas cluster`** → do **Step 1** (whitelist IP).
- **Google button shows error / login fails** → `GOOGLE_CLIENT_ID` not set in both `.env` files, or `http://localhost:5173` missing from Authorized origins.
- **No welcome email** → expected unless you fill the `SMTP_*` values (everything else works without it).
- **Push notifications** → only fire on HTTPS or `localhost`, and after you allow notifications in the browser (Profile → Enable push).
