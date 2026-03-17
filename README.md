# Sana — Focus together. Compete. Grow.

A social productivity web app where users track focused work time, compete with friends in "parties," and climb rankings. Think competitive Pomodoro + time-tracking with a social layer.

Built with Next.js 16, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Pomodoro Timer** — Reliable timer using Web Workers that works even when the browser tab is inactive or the device sleeps. Configurable work/break durations with sound and browser notifications.
- **Manual Time Logging** — Log time with category tags, notes, and party assignment.
- **Activity Heatmap** — GitHub-style 365-day contribution heatmap showing daily focus time.
- **Parties** — Create groups, invite friends by username or link, compete on daily/weekly/monthly leaderboards.
- **Real-time Chat** — Group chat within each party using Supabase Realtime (WebSockets).
- **Live Rankings** — Leaderboards update in real-time as members log time.
- **Win System** — Daily, weekly, and monthly winners are tracked and displayed.
- **Public Profiles** — View any user's stats, heatmap, and achievements.
- **OAuth Authentication** — Sign in with GitHub, Google, or Apple.
- **Two-Factor Authentication** — Optional TOTP-based 2FA via authenticator apps.
- **Dark Theme** — Minimalistic, modern dark UI inspired by Linear and Raycast.
- **Mobile Responsive** — Works well on phone screens with bottom navigation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database & Auth | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Styling | Tailwind CSS v4 |
| Real-time | Supabase Realtime (WebSocket channels) |
| Icons | Lucide React |
| Date/Time | date-fns |

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Anon Key** from Settings → API.

### 2. Run Database Migrations

Open the Supabase SQL Editor and paste the contents of `supabase/migration.sql`. This creates:

- All tables (profiles, parties, party_members, time_entries, party_messages, wins)
- Indexes for performance
- Row Level Security (RLS) policies
- PostgreSQL functions (rankings, heatmap, win calculation)
- Triggers (auto-create profile on signup, update total focus minutes)

### 3. Create Storage Bucket

In the Supabase Dashboard:
1. Go to Storage → New Bucket
2. Name: `avatars`
3. Check "Public bucket"
4. Add storage policies:
   - **SELECT**: Allow public access (anyone can view avatars)
   - **INSERT**: Allow authenticated users to upload to their folder (`(bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])`)

### 4. Enable Realtime

In the Supabase Dashboard:
1. Go to Database → Replication
2. Enable realtime for: `party_messages`, `time_entries`, `party_members`

### 5. Configure OAuth Providers

#### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App
2. Set Homepage URL to your app URL (e.g., `http://localhost:3000`)
3. Set Authorization callback URL to: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → GitHub → Enable and paste credentials

#### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
3. Copy Client ID and Client Secret
4. In Supabase Dashboard → Authentication → Providers → Google → Enable and paste credentials

#### Apple
1. Go to [Apple Developer](https://developer.apple.com/) → Services → Sign in with Apple
2. Create a Service ID and configure the redirect URL
3. In Supabase Dashboard → Authentication → Providers → Apple → Enable and paste credentials
4. Note: Apple requires a paid developer account ($99/year)

### 6. Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 8. Set Up Win Calculation Cron Jobs (Optional)

For automatic win calculation, enable `pg_cron` in your Supabase project and run the cron schedule commands in `supabase/migration.sql` (they're commented out at the bottom).

Alternatively, wins can be calculated on-the-fly when viewing party rankings.

## Project Structure

```
├── app/
│   ├── layout.tsx                    Root layout
│   ├── page.tsx                      Landing / redirect
│   ├── (auth)/
│   │   ├── login/page.tsx            OAuth sign-in
│   │   └── onboarding/page.tsx       Username setup
│   ├── auth/callback/route.ts        OAuth callback handler
│   └── (app)/
│       ├── layout.tsx                App shell with navbar
│       ├── dashboard/page.tsx        Main dashboard
│       ├── settings/page.tsx         Profile settings + 2FA
│       ├── profile/[username]/       Public profile
│       ├── parties/page.tsx          Party list + create
│       ├── party/[id]/page.tsx       Party detail (ranking + chat)
│       ├── party/[id]/settings/      Party settings (owner)
│       └── invite/[code]/page.tsx    Invite link handler
├── components/
│   ├── ui/                           Reusable primitives
│   ├── PomodoroTimer.tsx             Timer with Web Worker
│   ├── ManualTimeEntry.tsx           Manual logging form
│   ├── ActivityHeatmap.tsx           365-day heatmap
│   ├── Ranking.tsx                   Leaderboard
│   ├── PartyChat.tsx                 Real-time chat
│   ├── StatsCards.tsx                Day/week/month stats
│   ├── WinBadges.tsx                 Achievement counters
│   ├── PartyCard.tsx                 Party preview card
│   ├── InviteModal.tsx               Search + invite users
│   ├── Navbar.tsx                    Top + mobile navigation
│   └── AuthProvider.tsx              Auth context
├── hooks/
│   ├── useTimer.ts                   Pomodoro Web Worker hook
│   ├── usePartyRanking.ts            Real-time ranking
│   ├── useChat.ts                    Real-time chat
│   ├── useTimeEntries.ts             Time entry CRUD
│   └── useProfile.ts                 Profile data
├── lib/
│   ├── supabase/                     Supabase clients
│   ├── utils.ts                      Helper functions
│   └── constants.ts                  App constants
├── public/
│   └── timer-worker.js               Web Worker for timer
├── middleware.ts                      Auth middleware
└── supabase/
    └── migration.sql                 Database schema
```

## Deployment

This app is Vercel-ready. Connect your GitHub repository to Vercel and add the environment variables. The app will deploy automatically.

## License

MIT
