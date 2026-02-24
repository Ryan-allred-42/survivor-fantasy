# Survivor Fantasy — Season 50

A full-stack Survivor Season 50 fantasy league app built with Next.js 16, Tailwind CSS, ShadCN, and Supabase.

---

## Setup

### 1. Supabase Project

1. Create a new project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the contents of `supabase/schema.sql` to create all tables and RLS policies.
3. Optionally run `supabase/seed.sql` to pre-populate episodes and placeholder players.

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

All three values are found in your Supabase project → **Settings → API**.

### 3. Set Yourself as Admin

After signing up for an account in the app, run this in the Supabase SQL Editor (replace the email):

```sql
UPDATE survivor_profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

This unlocks the `/admin` portal for your account.

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Adding the Season 50 Cast

Once the cast is announced, update the players either:

- **Via Admin Portal** → `/admin/players` → "Add Player" button
- **Via SQL** → Update `supabase/seed.sql` with real names/tribes and run it

---

## How Scoring Works

### Weekly Flow
- Each week users get **10 base points** to allocate across remaining players
- Correctly guessing the eliminated player earns **+5 bonus points** the following week
- Missing a week (0 points allocated) uses your **one-time mulligan** — earns +10 extra points the following week (only works once per season per league)

### Scoring Methods (set at league creation)

| Method | Name | How it scores |
|--------|------|---------------|
| `winner_only` | Final Tribal | Only allocations to the season winner count |
| `top_five` | Jury's Choice | Allocations to the top 5 finishers count |
| `full_season` | Full Season | All eliminations score points; longer-lasting = higher multiplier |

### Admin: Resolving Episodes

After each episode airs:
1. Go to `/admin/episodes`
2. Select the eliminated player from the dropdown
3. Click **Resolve** — this triggers scoring for all `full_season` leagues and marks guesses correct/incorrect

At the end of the season, go to `/admin` and click **Run Season-End Scoring** to finalize `winner_only` and `top_five` leagues.

---

## File Structure

```
app/
  page.js                    Landing page
  auth/signin/page.js        Sign in
  auth/signup/page.js        Create account
  dashboard/page.js          League hub
  league/[id]/page.js        Leaderboard
  league/[id]/picks/page.js  Weekly picks
  league/[id]/history/page.js Scoring history
  admin/                     Admin portal
actions/
  auth.js                    Sign in/up/out
  leagues.js                 Create/join league
  picks.js                   Submit weekly picks
  admin.js                   Episode resolution, player mgmt
lib/
  supabase/                  Supabase client, server, middleware
  scoring.js                 Scoring engine (all 3 methods)
  picks.js                   Budget helpers, player fetch
  utils.js                   Join code generation, date helpers
supabase/
  schema.sql                 All tables + RLS policies
  seed.sql                   Episode dates + placeholder players
```
