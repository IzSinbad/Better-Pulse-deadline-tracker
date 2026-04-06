# better_pulse

Track all your Conestoga deadlines without losing your mind.

Connects to your Brightspace calendar feed to pull every assignment, quiz, discussion, and exam across all your courses into one clean dashboard. Get notified before things are due, see course announcements in one place, and never wonder what happens to your grade if you bomb an assignment.

> Built for Conestoga College students. Requires a `@conestogac.on.ca` or `@conestoga.ca` email to sign up.

**Live app:** https://better-pulse-deadline-tracker.vercel.app

---

## Features

- **Brightspace sync** — pulls from your personal iCal calendar feed, no API keys or admin approval needed
- **5 views** — Timeline, Urgent, By Course, Calendar, and Announcements
- **Done section** — mark anything as done, undo it if you change your mind
- **Course announcements** — add your Brightspace RSS feeds once, see all course posts in one place
- **Grade impact calculator** — shows what you need on each item to hit your target grade, and what happens if you score 0
- **Study assistant** — ask questions about your deadlines in plain English (owner only)
- **Live countdowns** — every card shows a live ticking timer, color-coded by urgency
- **Push notifications** — 3 warnings per deadline (10 days, 5 days, 1 day before), plus new announcement alerts
- **30-day sessions** — log in once with a magic link, stay logged in for a month across all devices
- **PWA** — install to your iPhone or Android home screen, feels like a native app
- **Dark and light mode** — dark by default

---

## Tech Stack

| Layer | What |
|-------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Next.js API routes (serverless on Vercel) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase magic link (email OTP — no password) |
| Deadline sync | Brightspace iCal calendar feed (`.ics` parsing, no OAuth needed) |
| Announcements | Brightspace RSS feeds (standard RSS 2.0) |
| AI assistant | Anthropic Claude API (claude-sonnet-4-6) |
| Push notifications | Web Push API via `web-push`, Vercel Cron for daily delivery |
| Deployment | Vercel (auto-deploy on push) + Supabase |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works fine)

### Steps

```bash
# 1. clone the repo
git clone https://github.com/IzSinbad/Better-Pulse-deadline-tracker.git
cd Better-Pulse-deadline-tracker

# 2. install dependencies
npm install

# 3. create your env file
cp .env.local.example .env.local
# open .env.local and fill in all the values

# 4. set up the database
# go to Supabase → SQL Editor → run the SQL in the "Database Schema" section below

# 5. run dev server
npm run dev
# open http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server only, never expose) |
| `SESSION_SECRET` | ✅ | Random 32+ char string — `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | ✅ | 64 char hex string — `openssl rand -hex 32` |
| `NEXTAUTH_URL` | ✅ | Your app's base URL (e.g. `https://better-pulse-deadline-tracker.vercel.app`) |
| `ANTHROPIC_API_KEY` | Optional | Enables study assistant (owner-only feature) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | For push notifications — generate below |
| `VAPID_PRIVATE_KEY` | Optional | For push notifications |
| `VAPID_EMAIL` | Optional | Contact email shown in push subscription |
| `CRON_SECRET` | Optional | Secures the daily notification cron — any random string |

### Generating VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

Copy the public and private keys into your env vars.

---

## Database Schema

Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
-- users
create table users (
  id uuid default gen_random_uuid() primary key,
  microsoft_user_id text,
  email text unique not null,
  display_name text,
  brightspace_ical_url_encrypted text,
  brightspace_token_encrypted text,
  anthropic_key_encrypted text,
  created_at timestamptz default now(),
  last_login timestamptz
);

-- sessions (30-day login tokens)
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  token_hash text unique not null,
  expires_at timestamptz not null,
  device_hint text,
  created_at timestamptz default now()
);

-- deadlines synced from Brightspace
create table deadlines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  brightspace_id text,
  course_code text,
  course_name text,
  title text not null,
  type text not null default 'assignment',
  due_at timestamptz,
  weight_percent numeric,
  description text,
  deeplink_url text,
  is_completed boolean not null default false,
  is_manual boolean not null default false,
  synced_at timestamptz default now()
);

-- per-course target grades
create table target_grades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  course_code text not null,
  target_percent numeric,
  updated_at timestamptz default now(),
  unique(user_id, course_code)
);

-- user preferences
create table preferences (
  user_id uuid references users(id) on delete cascade primary key,
  dark_mode boolean not null default true,
  default_view text not null default 'timeline',
  confetti_enabled boolean not null default true,
  notification_lead_hours integer not null default 24,
  updated_at timestamptz default now()
);

-- push notification subscriptions (one per device)
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  endpoint text not null,
  subscription_json text not null,
  updated_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- announcement RSS feeds (one per course)
create table announcement_feeds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  feed_url_encrypted text not null,
  course_name text not null,
  created_at timestamptz default now()
);

-- tracks which notifications have been sent (prevents duplicates)
create table notification_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  ref_id text not null,
  notification_type text not null,
  sent_at timestamptz default now(),
  unique(user_id, ref_id, notification_type)
);
```

---

## First-Time Setup (for users)

### 1. Log in
Go to the app and enter your Conestoga email. You'll get a magic link — click it to sign in. No password needed.

### 2. Connect Brightspace (deadlines)
You need your personal Brightspace iCal calendar feed URL:

1. Log into [eConestoga](https://conestoga.desire2learn.com)
2. Go to **Calendar** (top nav)
3. Click the ⚙️ gear icon → **Calendar Options** → **Calendar Feeds**
4. Enable calendar feeds and copy the URL
5. Paste it into the setup screen

### 3. Add course announcements (optional)
For each course you want announcements from:

1. Open the course on Brightspace
2. Go to **News / Announcements**
3. Scroll to the bottom of the page — look for an RSS icon or link
4. Copy that URL and paste it into the Announcements tab → Add Course Feed

> **Tip:** The RSS token is the same for all your courses. If you have the course URL (e.g. `https://conestoga.desire2learn.com/d2l/home/1518652`), the course ID is the number at the end (`1518652`). The RSS URL pattern is: `https://conestoga.desire2learn.com/d2l/le/news/rss/{courseId}/course?token={yourToken}&ou={courseId}`

### 4. Enable notifications (optional)
Open the sidebar → click **Enable notifications** → allow when prompted.

You'll get notified:
- **10 days** before a deadline
- **5 days** before a deadline  
- **1 day** before a deadline
- When a **new announcement** is posted (checked daily at 9 AM UTC)

---

## Deployment (Vercel)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo
3. Add all environment variables in Vercel dashboard → Settings → Environment Variables
4. Deploy

After deploying, update your **Supabase auth settings**:
- Dashboard → Authentication → URL Configuration
- Set **Site URL** to your Vercel URL
- Add your Vercel URL to **Redirect URLs**

The daily notification cron (`/api/cron/notifications`) runs automatically at 9 AM UTC via Vercel Cron. No extra setup needed.

---

## PWA — Install on Your Phone

### iPhone (iOS 16.4+)
1. Open the app in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button → **Add to Home Screen** → **Add**
3. Push notifications work once installed this way

### Android
1. Open in Chrome
2. Tap **⋮** menu → **Add to Home screen**

---

## Access Control

- Only `@conestogac.on.ca` and `@conestoga.ca` emails can sign up
- Each user's data is fully isolated — students only see their own deadlines and courses
- The AI study assistant is restricted to the app owner's email

---

## License

MIT
