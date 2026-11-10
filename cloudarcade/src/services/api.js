import { createClient } from "@supabase/supabase-js";
import { GAMES, earnedBadges } from "../catalog";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
const STORAGE = "cloudarcade-guest-v1";
const empty = () => ({
  sessions: [],
  badges: [],
  progress: null,
  profile: {
    display_name: "Guest Player",
    username: "guest",
    created_at: new Date().toISOString(),
  },
});
function local() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(STORAGE) || "{}") };
  } catch {
    return empty();
  }
}
function write(value) {
  localStorage.setItem(STORAGE, JSON.stringify(value));
}
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
export async function gameApi(action, payload = {}) {
  const data = unwrap(
    await supabase.functions.invoke("game-api", {
      body: { action, ...payload },
    }),
  );
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function loadPlayer(user) {
  if (!user) return local();
  const [profile, sessions, badges] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(unwrap),
    supabase
      .from("game_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(1000)
      .then(unwrap),
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id)
      .then(unwrap),
  ]);
  return { profile, sessions, badges: badges.map((x) => x.achievement_id) };
}
export async function loadGames() {
  return supabase
    ? unwrap(await supabase.from("games").select("*").order("title"))
    : GAMES.map((g) => ({ ...g, is_active: true }));
}
export async function startGame(user, game) {
  return user
    ? gameApi("start", { game_id: game })
    : { id: crypto.randomUUID(), started_at: new Date().toISOString() };
}
export async function finishGame(user, session, game, score, maxTile = 0) {
  if (user)
    return gameApi("finish", {
      session_id: session.id,
      score,
      max_tile: maxTile,
    });
  const data = local();
  if (data.sessions.some((s) => s.id === session.id)) return;
  const result = {
    id: session.id,
    game_id: game,
    final_score: score,
    max_tile: maxTile,
    started_at: session.started_at,
    ended_at: new Date().toISOString(),
    status: "completed",
  };
  data.badges = [
    ...new Set([...data.badges, ...earnedBadges(data.sessions, result)]),
  ];
  data.sessions = [result, ...data.sessions];
  write(data);
}
export async function saveProgress(user, state) {
  if (!user) {
    const data = local();
    data.progress = state;
    write(data);
    return;
  }
  unwrap(
    await supabase.from("saved_progress").upsert(
      {
        user_id: user.id,
        game_id: "2048",
        state_data: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,game_id" },
    ),
  );
}
export async function getProgress(user) {
  if (!user) return local().progress;
  return unwrap(
    await supabase
      .from("saved_progress")
      .select("state_data")
      .eq("user_id", user.id)
      .eq("game_id", "2048")
      .maybeSingle(),
  )?.state_data;
}
export async function clearProgress(user) {
  if (!user) {
    const data = local();
    data.progress = null;
    write(data);
    return;
  }
  unwrap(
    await supabase
      .from("saved_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("game_id", "2048"),
  );
}
export async function updateProfile(user, display_name) {
  if (!user) {
    const data = local();
    data.profile.display_name = display_name;
    write(data);
    return;
  }
  unwrap(
    await supabase.from("profiles").update({ display_name }).eq("id", user.id),
  );
}
export async function leaderboard(game, weekly = false) {
  return supabase
    ? unwrap(
        await supabase.rpc("get_leaderboard", {
          p_game: game === "all" ? null : game,
          p_weekly: weekly,
        }),
      )
    : [];
}
export async function adminStats() {
  return unwrap(await supabase.rpc("admin_stats"));
}
export async function personalRank(game, weekly = false) {
  return (
    unwrap(
      await supabase.rpc("get_personal_rank", {
        p_game: game === "all" ? null : game,
        p_weekly: weekly,
      }),
    )?.[0] || null
  );
}
export async function toggleGame(id, is_active) {
  unwrap(await supabase.from("games").update({ is_active }).eq("id", id));
}
