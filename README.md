# Campus Pulse

College voting and quiz web app built with:

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Realtime, Storage)
- Framer Motion

## Implemented Scope

### Phase 1 (MVP)

- .edu signup + login
- SSR Supabase auth helpers
- Profile creation on signup
- Create poll page (`/create`) with:
  - Dynamic options
  - Blind mode toggle
  - Ephemeral 24h mode
  - Privacy mode
  - Option image upload to Supabase Storage
- Vote page (`/vote/[id]`) with:
  - Expiry handling (Voting Closed)
  - One vote per user per poll
  - Blind mode result hiding
  - Real-time result updates via Supabase Realtime
  - Animated result bars

### Included from Later Phases

- QR poster + PNG download on vote page
- QR scan counter (`?source=qr`) + creator analytics card
- Quiz schema + quiz unlock flow before voting
- XP, levels, power-vote limit, and streak logic in SQL triggers/functions
- Leaderboard page (`/leaderboard`)
- Content moderation utility for poll creation requests
- Dark mode toggle with localStorage persistence
- Installable PWA basics (manifest + service worker)

## Supabase Setup

1. Create a new Supabase project.
2. In SQL Editor, run the full schema at:

	- `supabase/schema.sql`

3. In Authentication settings:

	- Enable Email/Password provider.

4. Copy environment variables to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build Check

```bash
npm run lint
npm run build
```

Both pass in current workspace.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Set environment variables:

	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `NEXT_PUBLIC_APP_URL`

4. Deploy.

## Notes

- Replace placeholder blocked words in `src/lib/moderation.ts` with your real moderation list.
- If you use email confirmation flows, add an auth callback route and redirect URL config in Supabase.
