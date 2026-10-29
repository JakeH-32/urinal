# Crowd stats setup

Crowd stats show players how everyone else answered: "Better hydrated than 72% of players today", "Most went with #7 (60%)". They need a small free database. Until it's set up, the game hides the feature and makes no network calls.

What gets stored: the day, round, urinal picked, grade, end-of-day score, and a random ID made up by each phone or browser. No names, accounts or locations.

## Setup (about 10 minutes, free)

1. **Sign in.** Go to [supabase.com](https://supabase.com), click **Start your project**, and sign in with GitHub.
2. **Make a project.** Click **New project**. Name it `urinal`, pick the region closest to you, and click **Create new project**. Supabase asks for a database password. Let it generate one (you won't need it again). Wait a minute or two for the project to finish setting up.
3. **Create the tables.** In the left sidebar open **SQL Editor**. Copy everything in [`supabase/schema.sql`](../supabase/schema.sql), paste it in, and click **Run**. It should say "Success. No rows returned". It's safe to run again later.
4. **Copy two values.** Click **Connect** at the top of the project, or open **Project Settings → API Keys**. Copy:
   - the **Project URL**, which looks like `https://abcdefghijkl.supabase.co`
   - the **anon public** key, a long string starting with `eyJ`. It's on the **Legacy API keys** tab. The newer **publishable** key (starts with `sb_publishable_`) works too.

   Both are meant to be public. The database only lets them add picks and read totals. Never copy the **service_role** or **secret** key.
5. **Hand them over.** Either:
   - send both to Claude and ask it to add them, or
   - add them yourself on GitHub: open the repo and go to **Settings → Secrets and variables → Actions → Variables** tab → **New repository variable**. Add these two:
     - `VITE_SUPABASE_URL` = the Project URL
     - `VITE_SUPABASE_ANON_KEY` = the anon key

     Then open **Actions → Deploy to GitHub Pages → Run workflow** (or just push to `main`). Stats go live with that deploy.

## Checking it works

Play today's Urinal on the live site. After the first round, a line like "You're the first one in today." should appear under the verdict. In Supabase, **Table Editor → picks** should show a row for each round you played.

## Local development (optional)

Create a file named `.env.local` in the project folder. It's git-ignored. Add these two lines:

```
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev`. Picks you make locally count toward the real stats.

## Notes

- Free Supabase projects pause after a week with no traffic. A paused project just means no stats until you hit **Restore** in the dashboard. The game keeps working either way.
- To wipe the stats, run `truncate public.picks, public.finishes;` in the SQL Editor.
- `schema.sql` only accepts picks for the current day. If the Urinal #1 date (`URINAL_EPOCH` in `src/engine/daily.ts`) ever changes, update the date in `schema.sql` and run it again.
