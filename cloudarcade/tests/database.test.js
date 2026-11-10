import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("database migration, transaction rules, leaderboard and RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610270001_initial.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const alice = "11111111-1111-4111-8111-111111111111",
      bob = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users values ($1,'{"username":"alice","display_name":"Alice"}'),($2,'{"username":"bob","display_name":"Bob"}')`,
      [alice, bob],
    );
    const started = (
      await db.query("select * from public.start_game($1,$2)", [alice, "snake"])
    ).rows[0];
    await db.query(
      `update public.game_sessions set started_at=now()-interval '30 seconds' where id=$1`,
      [started.id],
    );
    await assert.rejects(
      db.query("select public.complete_game($1,$2,$3,$4)", [
        bob,
        started.id,
        100,
        0,
      ]),
      /Session not found/,
    );
    await assert.rejects(
      db.query("select public.complete_game($1,$2,$3,$4)", [
        alice,
        started.id,
        101,
        0,
      ]),
      /Invalid Snake score/,
    );
    await db.query("select public.complete_game($1,$2,$3,$4)", [
      alice,
      started.id,
      100,
      0,
    ]);
    await db.query("select public.complete_game($1,$2,$3,$4)", [
      alice,
      started.id,
      100,
      0,
    ]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.game_sessions where status=$1",
          ["completed"],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select count(*)::int n from public.user_achievements"))
        .rows[0].n,
      2,
    );
    const ranks = (
      await db.query("select * from public.get_leaderboard(null,false)")
    ).rows;
    assert.equal(ranks[0].display_name, "Alice");
    assert.equal(Number(ranks[0].score), 100);
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${bob}';set request.jwt.claims='{"app_metadata":{}}';`,
    );
    assert.equal(
      (await db.query("select * from public.game_sessions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        `insert into public.game_sessions(user_id,game_id) values ($1,'snake')`,
        [bob],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.start_game($1,$2)", [bob, "snake"]),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from public.get_personal_rank(null,false)"))
        .rows.length,
      0,
    );
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    assert.equal(
      Number(
        (await db.query("select * from public.get_personal_rank(null,false)"))
          .rows[0].position,
      ),
      1,
    );
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    await assert.rejects(
      db.query("select public.admin_stats()"),
      /Administrator access required/,
    );
    assert.equal(
      (
        await db.query(
          `update public.games set is_active=false where id='snake' returning id`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`update public.profiles set username='changed' where id=$1`, [
        bob,
      ]),
      /permission denied/,
    );
    await db.query(
      `update public.profiles set display_name='Bobby' where id=$1`,
      [bob],
    );
    await assert.rejects(
      db.query(
        `insert into public.saved_progress(user_id,game_id,state_data) values($1,'2048','{}')`,
        [alice],
      ),
      /row-level security/,
    );
    await db.exec(
      `set request.jwt.claims='{"app_metadata":{"role":"admin"}}';`,
    );
    assert.equal(
      (await db.query("select public.admin_stats() value")).rows[0].value.users,
      2,
    );
    await db.exec(
      `update public.games set is_active=false where id='snake';reset role;`,
    );
    await assert.rejects(
      db.query("select public.start_game($1,$2)", [alice, "snake"]),
      /Game is unavailable/,
    );
    assert.equal(
      (await db.query("select count(*)::int n from public.admin_activity"))
        .rows[0].n,
      1,
    );
    for (let i = 0; i < 12; i++)
      await db.query("select public.start_game($1,$2)", [bob, "2048"]);
    await assert.rejects(
      db.query("select public.start_game($1,$2)", [bob, "2048"]),
      /Too many starts/,
    );
  } finally {
    await db.close();
  }
});
