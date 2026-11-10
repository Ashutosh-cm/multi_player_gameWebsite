# Demonstration and validation

## Local walkthrough

1. Open `/`, enter as a guest, and inspect the dashboard's empty statistics.
2. Open Neon Snake. Collect food, pause/resume, use keyboard and touch controls, then hit a wall. Verify a saved result and First Flight achievement.
3. Open 2048, merge matching tiles, save, navigate away and resume. Finish the run and confirm the saved snapshot is cleared.
4. Play Space Shooter, hold Space and move. Confirm enemy hits award 25 points, escaped enemies cost a life, and the run ends at zero lives or 60 seconds.
5. Refresh the page and verify guest history remains in the same browser.
6. Search/filter the library. Check profile editing and locked/unlocked achievements.
7. Resize to 390px width and verify navigation, games, and controls remain usable.

## Cloud acceptance checklist (requires configured accounts)

- Register two distinct users, confirm email, log in/out, recover a password.
- Check signup duplicate usernames fail without creating an orphan profile.
- Complete games as each user and confirm per-game and overall leaderboard positions.
- Retry the same finish request: there must be one completed session and one copy of each achievement.
- Submit another user's session ID: it must fail. Submit an expired/abandoned session: it must fail.
- Directly insert or modify `game_sessions` and `user_achievements` with an ordinary authenticated client: both must fail.
- Query another user's profile, private sessions or progress: RLS must prevent access.
- Attempt to change `profiles.id`, `created_at`, or `username`: column grants must reject it.
- Attempt `start_game` or `complete_game` directly with the public key/user JWT: execution must fail.
- Attempt to disable a game or invoke `admin_stats()` as a regular user: both must fail.
- Set `user_metadata.role` to admin: it must not grant administrator access.
- Promote an intended admin via project-owner SQL, refresh their login, toggle a game and verify new starts fail while disabled.
- Submit negative, fractional, excessive, or game-inconsistent scores: the protected endpoint must reject them.
- Start more than 12 sessions in one minute: additional starts must fail until the window clears.
- Save 2048 on laptop A and resume as the same user on laptop B.
- Test direct navigation to `/play/snake` on the Pages domain and verify HTTPS and SPA routing.

## Suggested 8-slide presentation

1. Problem: fragmented browser games and nonpersistent scores.
2. Objectives: unified games, identity, cloud persistence, shared rankings.
3. Architecture: Pages → React, Auth, Edge Function, PostgreSQL.
4. Live UI and gameplay demonstration.
5. Database: profiles, games, sessions, achievements, user achievements, progress.
6. Security: JWT validation, RLS, service-only RPCs, admin app metadata.
7. Cloud concepts: managed hosting, BaaS, serverless functions, remote persistence.
8. Results, free-tier constraints, anti-cheat limitations and future scope.

Capture screenshots from your running, configured project for the report: dashboard, each game, leaderboard, achievements, admin, schema and hosting dashboard. Avoid showing API secrets or account credentials.
