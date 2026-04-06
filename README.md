# better_pulse

Track all your Conestoga deadlines without losing your mind.

Syncs with D2L Brightspace to pull every assignment, quiz, discussion, and exam across all your courses into one clean dashboard. Grade impact tracking tells you exactly what you need to score to hit your targets. Smart reminders so nothing sneaks up on you.

> Built for Conestoga College students.

---

## Features

- **Brightspace sync** — pulls assignments, quizzes, discussions, exams from all active courses
- **Grade impact calculator** — shows what you need on each item to hit your target grade
- **Workload heatmap** — 14-day color-coded strip so you can spot crunch days ahead
- **Four views** — Timeline, Calendar, By Course, and Urgent (< 72h)
- **Study assistant** — ask questions about your deadlines in plain English
- **Live countdowns** — every card shows a live ticking timer
- **30-day sessions** — log in once, stay logged in for a month, across all your devices
- **PWA** — install to your home screen on iPhone or Android, works offline with last-synced data
- **Push notifications** — get reminded before things are due (configurable lead time)
- **Dark and light mode** — dark by default because we're students

## Tech Stack

| Layer | What |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes |
| Database | Supabase (PostgreSQL) |
| Auth | Microsoft OAuth 2.0 via MSAL.js |
| LMS | D2L Brightspace REST API (adapter pattern) |
| Push | Web Push API via `web-push` |
| PWA | `next-pwa` |
| Deployment | Vercel + Supabase |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- An Azure App Registration for Microsoft OAuth
- A Brightspace API token (see below)

### Steps

```bash
# 1. clone the repo
git clone https://github.com/IzSinbad/Better-Pulse-deadline-tracker.git
cd Better-Pulse-deadline-tracker

# 2. install dependencies
npm install

# 3. copy env template
cp .env.example .env.local
# now open .env.local and fill in all the values (see table below)

# 4. set up the database
# go to your Supabase project → SQL Editor → paste supabase/schema.sql → run

# 5. run dev server
npm run dev
# open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MICROSOFT_CLIENT_ID` | ✅ | Azure app client ID |
| `MICROSOFT_CLIENT_SECRET` | ✅ | Azure app client secret |
| `MICROSOFT_TENANT_ID` | ✅ | `common` for personal + school accounts |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char string for session JWTs |
| `NEXTAUTH_URL` | ✅ | Your app's base URL (e.g. `https://better-pulse.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | From Supabase project settings (keep private) |
| `BRIGHTSPACE_API_BASE_URL` | ✅ | `https://learn.conestogac.on.ca` |
| `ENCRYPTION_KEY` | ✅ | 32-char hex key for AES encryption — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Optional | Enables study assistant |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | For push notifications |
| `VAPID_PRIVATE_KEY` | Optional | For push notifications |
| `VAPID_EMAIL` | Optional | Contact email for push |

---

## How to Get a Brightspace API Token

1. Go to [learn.conestogac.on.ca](https://learn.conestogac.on.ca) and log in
2. Click your name in the top right → **Profile**
3. Scroll down and click **Manage API Tokens**
4. Click **New Token**, give it a name like `better_pulse`, and set an expiry
5. Copy the generated token — paste it into better_pulse during setup

> The token gives read access to your courses and grades. It's stored encrypted and never shared.

---

## Microsoft OAuth Setup (Azure)

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Name it `better_pulse`, choose **Accounts in any org directory + personal Microsoft accounts**
3. Set Redirect URI to `https://your-app.vercel.app/api/auth/callback` (Web platform)
4. After creating, copy the **Application (client) ID** → `MICROSOFT_CLIENT_ID`
5. Go to **Certificates & secrets** → **New client secret** → copy the value → `MICROSOFT_CLIENT_SECRET`
6. For `MICROSOFT_TENANT_ID`, use `common` unless you have a school-specific tenant

For local dev, also add `http://localhost:3000/api/auth/callback` as a redirect URI.

---

## Deploying to Vercel + Supabase

```bash
# install Vercel CLI if you haven't
npm i -g vercel

# deploy (first time — follow the prompts)
vercel

# production deploy
vercel --prod
```

Set all environment variables in your Vercel project dashboard under **Settings → Environment Variables**.

Vercel auto-deploys on every push to `main/master` — so just push and you're live.

---

## PWA — Install on Your Phone

### iPhone (iOS 16.4+)
1. Open better_pulse in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button (the box with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** in the top right
5. Done — it's on your home screen and works offline

### Android
1. Open in Chrome
2. Tap the **⋮** menu → **Add to Home screen**
3. Or wait for Chrome to prompt you automatically

Push notifications work on iOS 16.4+ when installed to home screen.

---

## Contributing

PRs welcome. Keep commits under 500 line insertions. Use conventional commit format:

```
feat: add weekly email digest
fix: correct grade calculator for weighted courses
chore: update dependencies
```

---

## License

MIT
