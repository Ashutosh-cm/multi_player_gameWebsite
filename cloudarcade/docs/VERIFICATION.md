# Local verification — 28 October 2026

Environment: Windows, Node.js 24.18.0, npm 11.16.0.

| Check | Result |
|---|---|
| `npm test` | 10 tests passed |
| `npx playwright test` | 4 browser tests passed in Chromium |
| `npm run build` | Passed; deployable files in `dist/` |
| Dependency installation audit | 0 reported vulnerabilities at installation |
| Visual review | Desktop 1440px and mobile 390px dashboard screenshots reviewed |

The database test applies the actual migration to an isolated PGlite database with simulated Supabase Auth functions and database roles. It checks schema creation, account profile creation, foreign-session rejection, invalid score rejection, duplicate completion, achievements, leaderboards, personal ranks, private-record isolation, restricted writes, admin authorization, audit logging, disabled games and throttling.

Browser tests cover Snake completion and persistent badges, 2048 save/resume and unique completion, library search/filtering, profile edits, restricted admin access, mobile navigation/overflow, and shooter pause/restart/game-over persistence.

Live Supabase authentication, email delivery, deployed Edge Function invocation, cross-device synchronization and Cloudflare Pages hosting have **not** been verified. They require the owner's cloud accounts and configuration. Follow the cloud acceptance checklist in `DEMO-AND-TESTING.md` after deployment.
