import { createClient } from "npm:@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Sign in to submit results" }, 401);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user)
    return reply({ error: "Invalid or expired session" }, 401);
  try {
    const raw = await req.text();
    if (raw.length > 4096) return reply({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    let result;
    if (body.action === "start") {
      if (!["snake", "2048", "shooter"].includes(body.game_id))
        return reply({ error: "Unknown game" }, 400);
      result = await admin.rpc("start_game", {
        p_user: user.id,
        p_game: body.game_id,
      });
    } else if (body.action === "finish") {
      if (
        typeof body.session_id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(body.session_id) ||
        !Number.isSafeInteger(body.score) ||
        body.score < 0 ||
        body.score > 10000000 ||
        !Number.isSafeInteger(body.max_tile ?? 0)
      )
        return reply({ error: "Invalid game result" }, 400);
      result = await admin.rpc("complete_game", {
        p_user: user.id,
        p_session: body.session_id,
        p_score: body.score,
        p_max_tile: body.max_tile ?? 0,
      });
    } else return reply({ error: "Unknown action" }, 400);
    if (result.error) return reply({ error: result.error.message }, 400);
    return reply(result.data);
  } catch {
    return reply({ error: "Unable to process request" }, 400);
  }
});
