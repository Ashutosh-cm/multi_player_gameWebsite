import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import {
  Gamepad2,
  LayoutDashboard,
  Library as LibraryIcon,
  Trophy,
  User,
  Shield,
  ArrowUpRight,
  ArrowRight,
  Play,
  Cloud,
  Zap,
  Clock,
  Target,
  ChevronRight,
  LogOut,
  Search,
  Pause,
  RotateCcw,
  Save,
  Check,
  Menu,
  X,
  Medal,
} from "lucide-react";
import { GAMES, BADGES } from "./catalog";
import * as api from "./services/api";
import { Snake, Puzzle, Shooter } from "./games/Games";
import { validProgress } from "./games/logic";
const Context = createContext();
const useApp = () => useContext(Context);
const number = (n) => Number(n || 0).toLocaleString();
const title = (id) => GAMES.find((g) => g.id === id)?.title || id;
function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(!api.supabase),
    [data, setData] = useState({
      profile: { display_name: "Guest Player" },
      sessions: [],
      badges: [],
    }),
    [catalog, setCatalog] = useState([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await api.loadPlayer(user));
    } catch (e) {
      setError(e.message);
    }
  }, [user]);
  const refreshGames = useCallback(async () => {
    try {
      setCatalog(await api.loadGames());
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    if (!api.supabase) return;
    api.supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setUser(data?.session?.user || null);
        setReady(true);
      })
      .catch((error) => {
        setError(error.message);
        setReady(true);
      });
    const {
      data: { subscription },
    } = api.supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (ready) refresh();
  }, [ready, refresh]);
  useEffect(() => {
    refreshGames();
  }, [refreshGames]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <Context.Provider
      value={{
        user,
        ready,
        data,
        catalog,
        refresh,
        refreshGames,
        setError,
        setNotice,
      }}
    >
      {children}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
function Art({ game, hero = false }) {
  return (
    <div
      className={`art art-${game} ${hero ? "hero-art" : ""}`}
      aria-hidden="true"
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      {game === "snake" ? (
        <div className="snake-art">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <b>••</b>
          <i />
        </div>
      ) : game === "2048" ? (
        <div className="tiles-art">
          <span>2</span>
          <span>8</span>
          <span>64</span>
          <span>2048</span>
        </div>
      ) : (
        <>
          <div className="planet" />
          <div className="ship">▲</div>
          <i className="laser l1" />
          <i className="laser l2" />
          <i className="star s1" />
          <i className="star s2" />
          <i className="star s3" />
        </>
      )}
    </div>
  );
}
function GameCard({ game }) {
  const { data } = useApp();
  const best = Math.max(
    0,
    ...data.sessions
      .filter((s) => s.game_id === game.id)
      .map((s) => s.final_score),
  );
  return (
    <Link to={`/play/${game.id}`} className="game-card">
      <div className="card-art">
        <Art game={game.id} />
        <span className={`category ${game.color}`}>{game.category}</span>
        <span className="play-round">
          <Play size={19} fill="currentColor" />
        </span>
      </div>
      <div className="card-info">
        <div>
          <h3>{game.title}</h3>
          <ArrowUpRight size={19} />
        </div>
        <p>{game.description}</p>
        <footer>
          <span>
            <Target size={13} />
            {game.difficulty}
          </span>
          <strong>
            {best ? `${number(best)} PB` : "Set your first score"}
          </strong>
        </footer>
      </div>
    </Link>
  );
}
function Heading({ eyebrow, title: heading, children, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{heading}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
function Stats() {
  const { data } = useApp();
  return (
    <div className="stats">
      {[
        [Gamepad2, "Games played", data.sessions.length, "Every run counts"],
        [
          Trophy,
          "Personal records",
          new Set(
            data.sessions
              .filter((s) => s.final_score > 0)
              .map((s) => s.game_id),
          ).size,
          "Your best, across games",
        ],
        [
          Medal,
          "Achievements",
          `${data.badges.length} / ${BADGES.length}`,
          "Keep the momentum",
        ],
        [
          Clock,
          "Time played",
          `${Math.round(data.sessions.reduce((n, s) => n + Math.max(0, new Date(s.ended_at) - new Date(s.started_at)), 0) / 60000)} min`,
          "Time well played",
        ],
      ].map(([Icon, label, value, sub]) => (
        <div className="stat" key={label}>
          <span className="stat-icon">
            <Icon size={19} />
          </span>
          <p>{label}</p>
          <strong>{value}</strong>
          <small>{sub}</small>
        </div>
      ))}
    </div>
  );
}
function Activity() {
  const { data } = useApp();
  return (
    <div className="panel">
      <div className="section-title">
        <h2>Recent activity</h2>
        <span className="muted">Your latest runs</span>
      </div>
      {!data.sessions.length ? (
        <div className="empty">
          <Gamepad2 />
          <h3>Your story starts with a game</h3>
          <p>Finish a run and your results will appear here.</p>
          <Link to="/library">
            Find your first game <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="activity">
          {data.sessions.slice(0, 5).map((s) => (
            <div key={s.id}>
              <span
                className={`mini-game ${GAMES.find((g) => g.id === s.game_id)?.color}`}
              >
                <Gamepad2 size={19} />
              </span>
              <span>
                <strong>{title(s.game_id)}</strong>
                <small>{new Date(s.ended_at).toLocaleString()}</small>
              </span>
              <b>
                {number(s.final_score)} <small>pts</small>
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Dashboard() {
  const { data, catalog, user } = useApp();
  return (
    <>
      <Heading
        eyebrow="YOUR DAILY DOSE OF PLAY"
        title={`Hey, ${data.profile.display_name?.split(" ")[0] || "Player"} 👋`}
        action={
          <span className="status">
            <i />
            {user ? "Cloud connected" : "Local guest mode"}
          </span>
        }
      >
        Good to see you. Ready to beat your best?
      </Heading>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <span /> THE ARCADE IS OPEN
          </span>
          <h2>
            Small games.
            <br />
            Big <em>main character</em>
            <br />
            energy.
          </h2>
          <p>
            Take a break. Chase a high score.
            <br />
            Your next favorite game is right here.
          </p>
          <Link className="button primary" to="/library">
            Let’s play <ArrowRight size={17} />
          </Link>
          <span className="hero-caption">
            No downloads. Just one more round.
          </span>
        </div>
        <Art game="shooter" hero />
        <div className="hero-label">
          <span>01 / 03 — IN THE SPOTLIGHT</span>
          <strong>
            Space Shooter <ArrowUpRight size={18} />
          </strong>
        </div>
      </section>
      <Stats />
      <div className="section-title">
        <div>
          <span className="eyebrow">PICK YOUR NEXT CHALLENGE</span>
          <h2>Made for your next break</h2>
        </div>
        <Link to="/library">
          All games <ArrowRight size={16} />
        </Link>
      </div>
      <div className="game-grid">
        {GAMES.filter((g) =>
          catalog.some((c) => c.id === g.id && c.is_active),
        ).map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      <div className="bottom-grid">
        <Activity />
        <div className="panel achievement-preview">
          <div className="section-title">
            <h2>A little extra motivation</h2>
            <Medal size={20} />
          </div>
          <div className="badge-orb">✦</div>
          <h3>Good games. Great milestones.</h3>
          <p>
            From your first run to your next personal best.
            <br />
            There’s always something to unlock.
          </p>
          <Link to="/achievements">
            Explore achievements <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </>
  );
}
function Landing() {
  return (
    <div className="landing">
      <span className="pill">BROWSER GAMES. CLOUD POSSIBILITIES.</span>
      <h1>
        Your next high score
        <br />
        lives <em>here.</em>
      </h1>
      <p>
        Three games. Endless “one more try”.
        <br />
        Your own little corner of the arcade, wherever you are.
      </p>
      <div className="actions">
        <Link to="/auth?mode=register" className="button primary">
          Create your player account <ArrowRight size={18} />
        </Link>
        <Link to="/dashboard" className="button">
          Try as a guest
        </Link>
      </div>
      <div className="game-grid">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      <div className="stats">
        {[
          [
            Cloud,
            "Pick up anywhere",
            "Your account keeps scores and achievements together.",
          ],
          [
            Zap,
            "Straight into the action",
            "Open your browser. Choose your game. Play.",
          ],
          [
            Trophy,
            "Make it a personal best",
            "Chase records and climb game leaderboards.",
          ],
        ].map(([Icon, t, p]) => (
          <div className="stat" key={t}>
            <Icon />
            <h3>{t}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
function Library() {
  const { catalog } = useApp();
  const [filter, setFilter] = useState("All"),
    [search, setSearch] = useState("");
  const games = GAMES.filter(
    (g) =>
      catalog.some((c) => c.id === g.id && c.is_active) &&
      (filter === "All" || filter === g.category) &&
      g.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading eyebrow="FIND YOUR FLOW" title="The game library">
        A little strategy, a little nostalgia, a whole lot of play.
      </Heading>
      <div className="toolbar">
        <div className="tabs">
          {["All", "Arcade", "Puzzle", "Action"].map((t) => (
            <button
              className={t === filter ? "selected" : ""}
              onClick={() => setFilter(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Find a game…"
            aria-label="Search games"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="game-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      {!games.length && (
        <div className="empty">No games match. Try another search.</div>
      )}
    </>
  );
}
function Auth() {
  const { user, setError, setNotice } = useApp(),
    navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(query.get("mode") || "login"),
    [busy, setBusy] = useState(false);
  if (user && mode !== "update") return <Navigate to="/dashboard" replace />;
  async function submit(e) {
    e.preventDefault();
    if (!api.supabase) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      let result;
      const email = form.get("email"),
        password = form.get("password");
      if (mode === "register")
        result = await api.supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: form.get("username"),
              display_name: form.get("name"),
            },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
      else if (mode === "reset")
        result = await api.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth?mode=update",
        });
      else if (mode === "update")
        result = await api.supabase.auth.updateUser({ password });
      else
        result = await api.supabase.auth.signInWithPassword({
          email,
          password,
        });
      if (result.error) throw result.error;
      if (mode === "reset" || (mode === "register" && !result.data.session))
        setNotice("Check your email for the confirmation link.");
      else {
        setNotice(
          mode === "update" ? "Password updated." : "Welcome to CloudArcade!",
        );
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Art game="shooter" hero />
        <h2>
          One account.
          <br />A whole arcade.
        </h2>
        <p>Your games. Your records. Your next big moment.</p>
      </div>
      <form onSubmit={submit} className="auth-form">
        <span className="eyebrow">WELCOME TO CLOUDARCADE</span>
        <h1>
          {
            {
              login: "Back for another round?",
              register: "Your next adventure starts here.",
              reset: "Let’s get you back in.",
              update: "Choose a new password.",
            }[mode]
          }
        </h1>
        {!api.supabase && (
          <div className="callout">
            Cloud accounts aren’t connected yet. You can play all three games as
            a local guest.<Link to="/dashboard">Enter the arcade →</Link>
          </div>
        )}
        {mode === "register" && (
          <>
            <label>
              Display name
              <input
                name="name"
                required
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
              />
            </label>
            <label>
              Username
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,24}"
                title="3–24 letters, numbers or underscores"
                autoComplete="username"
              />
            </label>
          </>
        )}
        {mode !== "update" && (
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>
        )}
        <button className="button primary" disabled={busy || !api.supabase}>
          {busy
            ? "One moment…"
            : {
                login: "Sign in",
                register: "Create account",
                reset: "Send recovery link",
                update: "Update password",
              }[mode]}
          <ArrowRight size={17} />
        </button>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              <button type="button" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("register")}>
                Create an account
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("login")}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
function Leaderboard() {
  const { user, setError } = useApp();
  const [game, setGame] = useState("all"),
    [weekly, setWeekly] = useState(false),
    [rows, setRows] = useState([]),
    [personal, setPersonal] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.all([
      api.leaderboard(game, weekly),
      user ? api.personalRank(game, weekly) : Promise.resolve(null),
    ])
      .then(([r, own]) => {
        if (active) {
          setRows(r);
          setPersonal(own);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => (active = false);
  }, [game, weekly, user, setError]);
  return (
    <>
      <Heading eyebrow="A LITTLE FRIENDLY COMPETITION" title="The leaderboard">
        {game === "all"
          ? "Overall rankings use the sum of each player’s best score in each game."
          : "One game. Your best run. See where you stand."}
      </Heading>
      <div className="toolbar">
        <div className="tabs">
          {[["all", "Overall"], ...GAMES.map((g) => [g.id, g.title])].map(
            ([id, t]) => (
              <button
                key={id}
                className={game === id ? "selected" : ""}
                onClick={() => setGame(id)}
              >
                {t}
              </button>
            ),
          )}
        </div>
        <select
          aria-label="Ranking period"
          value={weekly ? "week" : "all"}
          onChange={(e) => setWeekly(e.target.value === "week")}
        >
          <option value="all">All time</option>
          <option value="week">Last 7 days</option>
        </select>
      </div>
      {user && !busy && (
        <div className="panel">
          <strong>
            {personal
              ? `Your rank: #${number(personal.position)} · ${number(personal.score)} points`
              : "Complete a run to earn your ranking."}
          </strong>
        </div>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Games ranked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                className={r.user_id === user?.id ? "own-row" : ""}
                key={r.user_id}
              >
                <td>
                  <span className={i < 3 ? "rank top" : "rank"}>{i + 1}</span>
                </td>
                <td>
                  <span className="avatar small">{r.display_name?.[0]}</span>{" "}
                  {r.display_name}
                  {r.user_id === user?.id && <span className="pill">You</span>}
                </td>
                <td>
                  <strong>{number(r.score)}</strong>
                </td>
                <td>{r.games_ranked}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {busy ? (
          <div className="empty">Loading rankings…</div>
        ) : (
          !rows.length && (
            <div className="empty">
              <Trophy />
              <h3>
                {api.supabase
                  ? "The top spot is waiting"
                  : "A bigger stage is coming"}
              </h3>
              <p>
                {api.supabase
                  ? "Complete a game while signed in to join the rankings."
                  : "Connect Supabase to enable shared leaderboards. Guest results stay on this browser."}
              </p>
            </div>
          )
        )}
      </div>
      <p className="footnote">
        Top 100 players · Casual rankings · Browser scores use basic server
        validation.
      </p>
    </>
  );
}
function Achievements() {
  const { data } = useApp();
  return (
    <>
      <Heading eyebrow="MAKE EVERY RUN COUNT" title="Your trophy cabinet">
        {data.badges.length} of {BADGES.length} milestones unlocked. Keep
        playing your way.
      </Heading>
      <div className="badge-grid">
        {BADGES.map((b) => (
          <div
            className={`panel badge ${data.badges.includes(b.id) ? "unlocked" : ""}`}
            key={b.id}
          >
            <span>{b.icon}</span>
            <h2>{b.name}</h2>
            <p>{b.description}</p>
            <small>
              {data.badges.includes(b.id) ? "✓ Unlocked" : "Not unlocked yet"}
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
function Profile() {
  const { data, user, refresh, setError, setNotice } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Heading eyebrow="YOUR CORNER OF THE ARCADE" title="Player profile">
        Every great run starts with you.
      </Heading>
      <div className="profile-card panel">
        <span className="avatar large">{data.profile.display_name?.[0]}</span>
        <div>
          <h2>{data.profile.display_name}</h2>
          <p>
            @{data.profile.username} · {user ? "Cloud player" : "Local guest"}
            {data.profile.created_at &&
              ` · Joined ${new Date(data.profile.created_at).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      <Stats />
      <form
        className="panel profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api.updateProfile(
              user,
              new FormData(e.currentTarget).get("display_name").trim(),
            );
            await refresh();
            setNotice("Profile updated.");
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Make yourself at home</h2>
        <label>
          Display name
          <input
            name="display_name"
            key={data.profile.display_name}
            defaultValue={data.profile.display_name}
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <button className="button primary" disabled={busy}>
          Save profile
        </button>
      </form>
      <Activity />
    </>
  );
}
function Admin() {
  const { user, catalog, refreshGames, setError } = useApp();
  const [stats, setStats] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user?.app_metadata?.role === "admin")
      api
        .adminStats()
        .then(setStats)
        .catch((e) => setError(e.message));
  }, [user, setError]);
  if (user?.app_metadata?.role !== "admin")
    return (
      <div className="empty">
        <Shield />
        <h1>Administrator access required</h1>
        <p>This area is available to authorized platform administrators.</p>
        <Link to="/dashboard">Back to the arcade</Link>
      </div>
    );
  return (
    <>
      <Heading eyebrow="PLATFORM OPERATIONS" title="Admin dashboard">
        Manage availability and monitor platform activity.
      </Heading>
      <div className="stats">
        {[
          ["Registered players", stats?.users],
          ["Completed sessions", stats?.sessions],
          ["Active games", catalog.filter((g) => g.is_active).length],
        ].map(([t, v]) => (
          <div className="stat" key={t}>
            <p>{t}</p>
            <strong>{v ?? "…"}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Game catalog</h2>
        {catalog.map((g) => (
          <div className="admin-row" key={g.id}>
            <div>
              <strong>{g.title}</strong>
              <p>
                {stats?.popular?.find((p) => p.game_id === g.id)?.sessions || 0}{" "}
                completed sessions
              </p>
            </div>
            <button
              disabled={busy}
              className="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await api.toggleGame(g.id, !g.is_active);
                  await refreshGames();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {g.is_active ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Recent leaderboard activity</h2>
        {stats?.recent?.length ? (
          stats.recent.map((r) => (
            <div className="admin-row" key={r.id}>
              <span>
                {r.display_name} · {title(r.game_id)}
              </span>
              <strong>{number(r.final_score)}</strong>
            </div>
          ))
        ) : (
          <p>No completed sessions yet.</p>
        )}
      </div>
    </>
  );
}
function GamePage() {
  const { id } = useParams();
  const { user } = useApp();
  return <GameSession key={`${id}-${user?.id || "guest"}`} id={id} />;
}
function GameSession({ id }) {
  const game = GAMES.find((g) => g.id === id),
    { user, catalog, refresh, setError, setNotice } = useApp();
  const [session, setSession] = useState(null),
    [score, setScore] = useState(0),
    [paused, setPaused] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(null),
    [initial, setInitial] = useState(null),
    [result, setResult] = useState(null),
    [submitted, setSubmitted] = useState(false);
  const puzzle = useRef(null),
    ended = useRef(false),
    submitBusy = useRef(false);
  useEffect(() => {
    if (id === "2048")
      api
        .getProgress(user)
        .then((p) => {
          if (validProgress(p)) setSaved(p);
        })
        .catch((e) => setError(e.message));
  }, [id, user, setError]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const submit = useCallback(
    async (res) => {
      if (submitBusy.current) return;
      submitBusy.current = true;
      setBusy(true);
      try {
        await api.finishGame(user, session, id, res.score, res.maxTile);
        setSubmitted(true);
        await refresh();
        if (id === "2048") {
          await api.clearProgress(user);
          setSaved(null);
        }
      } catch (e) {
        setError(`Result not saved: ${e.message}. Use Retry save.`);
      } finally {
        setBusy(false);
        submitBusy.current = false;
      }
    },
    [user, session, id, refresh, setError],
  );
  const onEnd = useCallback(
    (final, maxTile = 0) => {
      if (ended.current) return;
      ended.current = true;
      setScore(final);
      setDone(true);
      const res = { score: final, maxTile };
      setResult(res);
      submit(res);
    },
    [submit],
  );
  const onState = useCallback((s) => {
    puzzle.current = s;
  }, []);
  async function start(resume = false) {
    setBusy(true);
    try {
      const s = await api.startGame(user, id);
      setSession(s);
      setInitial(resume ? saved : null);
      setScore(resume ? saved.score : 0);
      puzzle.current = null;
      setDone(false);
      setPaused(false);
      setResult(null);
      setSubmitted(false);
      ended.current = false;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!game)
    return (
      <div className="empty">
        <h1>Game not found</h1>
        <Link to="/library">Back to library</Link>
      </div>
    );
  const active = catalog.some((g) => g.id === id && g.is_active);
  const Component = id === "snake" ? Snake : id === "2048" ? Puzzle : Shooter;
  return (
    <>
      <Link className="back" to="/library">
        ← Back to library
      </Link>
      <Heading
        eyebrow={`${game.category.toUpperCase()} / ${game.difficulty.toUpperCase()}`}
        title={game.title}
      >
        {game.description}
      </Heading>
      <div className="play-layout">
        <div className="panel play-panel">
          <div className="game-top">
            <span>
              <i className={`dot ${game.color}`} />
              {done
                ? "Run complete"
                : session
                  ? paused
                    ? "Paused"
                    : "Now playing"
                  : "Ready when you are"}
            </span>
            <strong>
              {number(score)} <small>PTS</small>
            </strong>
          </div>
          <div className="board-area">
            {session ? (
              <Component
                key={session.id}
                paused={paused || done}
                onScore={setScore}
                onEnd={onEnd}
                onState={onState}
                initial={initial}
              />
            ) : (
              <div className="game-splash">
                <Art game={id} />
                <div>
                  <h2>Your next record awaits.</h2>
                  <button
                    className="button primary"
                    disabled={busy || !active}
                    onClick={() => start()}
                  >
                    <Play size={18} />
                    {active ? "Start game" : "Game unavailable"}
                  </button>
                  {saved && active && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => start(true)}
                    >
                      Continue saved puzzle
                    </button>
                  )}
                </div>
              </div>
            )}
            {session && (paused || done) && (
              <div className="board-overlay">
                <h2>{done ? "That’s a wrap." : "Take a breather."}</h2>
                <p>
                  {done
                    ? `${number(score)} points · ${submitted ? "Result saved" : busy ? "Saving…" : "Result not yet saved"}`
                    : "Your game is paused."}
                </p>
                {!done && (
                  <button
                    className="button primary"
                    onClick={() => setPaused(false)}
                  >
                    Resume game
                  </button>
                )}
                {done && !submitted && !busy && (
                  <button className="button" onClick={() => submit(result)}>
                    Retry save
                  </button>
                )}
              </div>
            )}
          </div>
          {session && (
            <div className="game-actions">
              <button
                className="button"
                disabled={done}
                onClick={() => setPaused((v) => !v)}
              >
                <Pause size={15} />
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                className="button"
                disabled={busy || (!submitted && done)}
                onClick={() => start()}
              >
                <RotateCcw size={15} />
                Restart
              </button>
              {id === "2048" && !done && (
                <>
                  <button
                    className="button"
                    onClick={async () => {
                      setPaused(true);
                      try {
                        await api.saveProgress(user, puzzle.current);
                        setSaved(puzzle.current);
                        setNotice(
                          user
                            ? "Puzzle saved to your account."
                            : "Puzzle saved in this browser.",
                        );
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    <Save size={15} />
                    Save
                  </button>
                  <button
                    className="button primary"
                    onClick={() =>
                      onEnd(score, Math.max(...(puzzle.current?.board || [0])))
                    }
                  >
                    Finish run
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <aside className="game-sidebar">
          <div className="panel">
            <span className="eyebrow">THE BASICS</span>
            <h2>How to play</h2>
            <p>{game.controls}</p>
            <div className="keycaps">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>or arrow keys</span>
            </div>
          </div>
          <div className="panel">
            <Cloud size={23} />
            <h3>{user ? "Make every run count" : "Playing as a guest"}</h3>
            <p>
              {user
                ? "Completed runs update your cloud profile and leaderboard."
                : "Results are saved only in this browser. Sign in to keep your scores across devices."}
            </p>
            {!user && (
              <Link to="/auth">
                Sign in <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <p className="footnote">
            Restarting or leaving abandons an unfinished run. Save your 2048
            puzzle before leaving to continue later.
          </p>
        </aside>
      </div>
    </>
  );
}
function Shell() {
  const { user, ready, data, setError } = useApp();
  const [open, setOpen] = useState(false);
  const links = [
    ["/dashboard", LayoutDashboard, "Overview"],
    ["/library", LibraryIcon, "Game library"],
    ["/leaderboard", Trophy, "Leaderboards"],
    ["/achievements", Medal, "Achievements"],
    ["/profile", User, "My profile"],
  ];
  if (!ready) return <div className="loading">Connecting to your arcade…</div>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span>
            <Gamepad2 size={25} />
          </span>
          cloudarcade<span className="brand-dot">.</span>
        </Link>
        <span className="nav-caption">YOUR PLAYGROUND</span>
        <nav>
          {links.map(([path, Icon, label]) => (
            <NavLink to={path} key={path} onClick={() => setOpen(false)}>
              <Icon size={19} />
              {label}
              {path === "/library" && <small>3</small>}
            </NavLink>
          ))}
          {user?.app_metadata?.role === "admin" && (
            <NavLink to="/admin">
              <Shield size={19} />
              Admin dashboard
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="cloud-note">
            <span className="cloud-icon">
              <Cloud size={20} />
            </span>
            <strong>A little play, anywhere.</strong>
            <p>
              Your browser is your arcade.
              <br />
              Make yourself at home.
            </p>
            <span>
              <i />
              {api.supabase ? "Cloud services configured" : "Local preview"}
            </span>
          </div>
          <Link className="sidebar-profile" to="/profile">
            <span className="avatar">
              {data.profile.display_name?.[0] || "G"}
            </span>
            <span>
              <strong>{data.profile.display_name}</strong>
              <small>{user ? "Cloud player" : "Guest player"}</small>
            </span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label="Open navigation"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Your arcade <ChevronRight size={13} />
            <b>Make time for play</b>
          </span>
          <div>
            <span className="topbar-note">
              <span /> BROWSER-POWERED. CLOUD-CONNECTED.
            </span>
            {user ? (
              <button
                className="icon-button"
                title="Sign out"
                aria-label="Sign out"
                onClick={async () => {
                  const { error } = await api.supabase.auth.signOut();
                  if (error) setError(error.message);
                }}
              >
                <LogOut size={18} />
              </button>
            ) : (
              <Link className="signin" to="/auth">
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/play/:id" element={<GamePage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>This level doesn’t exist.</h1>
                  <Link to="/dashboard">Back to the arcade</Link>
                </div>
              }
            />
          </Routes>
          <footer className="site-footer">
            <span>© {new Date().getFullYear()} CloudArcade</span>
            <span>
              Built for the love of a good game. <Gamepad2 size={14} />
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
