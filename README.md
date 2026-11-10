# CloudArcade

CloudArcade is a browser arcade that brings three small games, player profiles, achievements, and leaderboards together in one responsive web app. It demonstrates a cloud application architecture using React and Vite for the interface, Supabase for authentication and managed PostgreSQL, and a Supabase Edge Function for protected game operations. Cloudflare Pages is the intended frontend host.

> The runnable application and its package configuration are in [`cloudarcade/`](cloudarcade/). Run the commands below from that directory.

## Contents

- [Features](#features)
- [Technology and architecture](#technology-and-architecture)
- [Run locally](#run-locally)
- [Connect Supabase](#connect-supabase)
- [Deploy to Cloudflare Pages](#deploy-to-cloudflare-pages)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Security and limitations](#security-and-limitations)

## Features

- **Three playable games:** Neon Snake and Space Shooter use HTML Canvas; 2048 uses a React tile board. Keyboard and touch controls are provided.
- **Arcade dashboard and library:** responsive landing and dashboard screens, searchable game catalog, player profile, recent activity, achievements, and leaderboards.
- **Guest play:** records, badges, display name, and saved 2048 progress are stored in the current browser with `localStorage`. Guest data is not uploaded or merged into an account.
- **Cloud accounts:** Supabase email/password registration, email confirmation, sign-in, password recovery, and sign-out.
- **Persistent cloud features:** authenticated scores and sessions, six server-awarded achievements, per-game and aggregate leaderboards, and cross-device 2048 saves.
- **Administration:** admin statistics, activity, and game availability controls protected by server-side role checks.

## Technology and architecture

| Area | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Lucide icons |
| Game engines | JavaScript, HTML Canvas, React; game rules in `src/games/logic.js` |
| Authentication and data | Supabase Auth and PostgreSQL |
| Protected operations | Supabase Edge Function (`game-api`) and database functions |
| Intended hosting | Cloudflare Pages |

Gameplay runs in the player's browser. The Edge Function validates the signed-in user's token and calls restricted database operations for starting and completing games. PostgreSQL row-level security (RLS) protects account data. Frontend assets can be served statically; the games do not require GPU servers.

## Run locally

Requires Node.js 22.12 or newer (Node.js 24 is supported).

```powershell
cd cloudarcade
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). Supabase credentials are not needed for guest mode. Cloud account features require the Supabase setup described below.

Useful project commands:

```powershell
npm test                 # game logic and isolated database/security tests
npm run build            # production frontend build
npm run preview          # serve the production build locally
npx playwright install chromium  # one-time setup for browser tests
npm run test:browser     # Playwright browser checks
```

The automated database checks use a local PostgreSQL-compatible engine (PGlite); they do not connect to a live Supabase project. Browser checks require Chromium.

## Connect Supabase

1. Create a Supabase project in your account. Keep the database password and service-role key private.
2. Apply [`cloudarcade/supabase/migrations/202610270001_initial.sql`](cloudarcade/supabase/migrations/202610270001_initial.sql) in the Supabase SQL Editor, or use the Supabase CLI (`supabase link` followed by `supabase db push`).
3. Copy `cloudarcade/.env.example` to `cloudarcade/.env.local` and set the project URL and public anon/publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
   ```

   Restart Vite after changing these values. Never place the service-role key in a `VITE_` variable or commit `.env.local`.

4. Deploy the Edge Function from `cloudarcade/`:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy game-api
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime. Although gateway JWT verification is disabled in the function configuration for compatibility, the handler validates each user's token with Supabase Auth before protected operations.

5. In Supabase Authentication URL Configuration, set the production Site URL and allow the local and production dashboard and password-update redirect URLs. Enable email/password authentication, keep email confirmation enabled, and configure email delivery if needed.

Only a project owner should grant an administrator role. The exact SQL and role details are in [`cloudarcade/README.md`](cloudarcade/README.md#grant-administrator-access).

## Deploy to Cloudflare Pages

Connect the repository to a Cloudflare Pages project with these settings:

- Framework preset: React (Vite)
- Root directory: `cloudarcade` (unless the app contents are moved to the repository root)
- Build command: `npm run build`
- Build output directory: `dist`
- Environment: set `NODE_VERSION` to `24` if needed and add both public `VITE_SUPABASE_*` variables

Add the deployed HTTPS Pages domain to the Supabase Site URL and redirect allowlist. Vite embeds public environment values at build time; rebuild after changing them. Full deployment steps and cloud acceptance guidance are in [`cloudarcade/README.md`](cloudarcade/README.md#deploy-to-cloudflare-pages) and [`cloudarcade/docs/DEMO-AND-TESTING.md`](cloudarcade/docs/DEMO-AND-TESTING.md).

## Project structure

```text
cloudarcade/
├── src/
│   ├── App.jsx                 # application screens, routes, and shared state
│   ├── main.jsx                # React entry point
│   ├── catalog.js              # game catalog and guest badge metadata
│   ├── games/                  # game interfaces and game rules
│   ├── services/api.js         # guest persistence and cloud API calls
│   └── styles.css              # application styling
├── supabase/
│   ├── migrations/             # database schema, policies, and functions
│   ├── functions/game-api/     # authenticated game API Edge Function
│   └── config.toml
├── tests/                      # game, database, deployment, and browser checks
├── docs/                       # project report, verification, demo guide, screenshots
├── public/                     # static hosting headers and routing rules
├── package.json
└── README.md                   # detailed app setup and deployment guide
```

## Documentation

- [Detailed setup, administration, deployment, and architecture guide](cloudarcade/README.md)
- [Project report](cloudarcade/docs/PROJECT-REPORT.md)
- [Demonstration and testing guide](cloudarcade/docs/DEMO-AND-TESTING.md)
- [Verification notes](cloudarcade/docs/VERIFICATION.md)
- [Desktop dashboard screenshot](cloudarcade/docs/dashboard-desktop.png) · [Mobile dashboard screenshot](cloudarcade/docs/dashboard-mobile.png)

## Security and limitations

The schema uses RLS and restricted grants; browsers cannot directly write scores or achievements. The Edge Function verifies the authenticated identity, and the database validates sessions and score submissions. Administrator checks are also enforced in the database. See the migration and project report for details.

This is a casual browser arcade, not an anti-cheat system: gameplay and puzzle state originate on the client, so score checks provide sanity validation rather than trusted replay verification. Guest data is local to one browser and can be cleared with browser storage. A Supabase project, migration, Edge Function deployment, email setup, and Cloudflare Pages project must be provisioned separately; the source repository alone does not imply a live deployment. Free-tier cost depends on provider quotas and account eligibility.

## License

No license file is currently included. Add a license before treating this project as open source or granting reuse rights.
