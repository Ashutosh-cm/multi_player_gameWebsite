export const GAMES = [
  {
    id: "snake",
    title: "Neon Snake",
    category: "Arcade",
    difficulty: "Easy to learn",
    description:
      "A familiar classic. A neon twist. Collect, grow, and keep your cool.",
    controls:
      "Arrow keys or WASD to move. Avoid walls and your tail. Each food earns 10 points.",
    color: "green",
  },
  {
    id: "2048",
    title: "2048",
    category: "Puzzle",
    difficulty: "A little strategy",
    description:
      "Small moves. Big numbers. Merge your way to the elusive 2048 tile.",
    controls:
      "Arrow keys, WASD, or swipe to slide. Equal tiles merge once per move. Finish to submit, or save to continue later.",
    color: "orange",
  },
  {
    id: "shooter",
    title: "Space Shooter",
    category: "Action",
    difficulty: "Quick reflexes",
    description:
      "One ship. Endless possibilities. Hold your ground among the stars.",
    controls:
      "Arrow keys or WASD to move. Hold Space to fire. Three lives. Survive for 60 seconds. Touch controls are below.",
    color: "purple",
  },
];
export const BADGES = [
  {
    id: "first",
    name: "First Flight",
    description: "Complete your first game",
    icon: "🚀",
  },
  {
    id: "hundred",
    name: "Triple Digits",
    description: "Score 100 points in a game",
    icon: "💯",
  },
  {
    id: "five",
    name: "Getting Warm",
    description: "Complete five games",
    icon: "🔥",
  },
  {
    id: "best",
    name: "Personal Best",
    description: "Beat a previous high score",
    icon: "⚡",
  },
  {
    id: "puzzle",
    name: "Puzzle Master",
    description: "Create a 2048 tile",
    icon: "🧩",
  },
  {
    id: "space",
    name: "Space Explorer",
    description: "Score 500 in Space Shooter",
    icon: "🪐",
  },
];
export function earnedBadges(sessions, result) {
  const previous = sessions.filter((s) => s.game_id === result.game_id);
  return [
    "first",
    ...(result.final_score >= 100 ? ["hundred"] : []),
    ...(sessions.length + 1 >= 5 ? ["five"] : []),
    ...(previous.length &&
    result.final_score > Math.max(...previous.map((s) => s.final_score))
      ? ["best"]
      : []),
    ...(result.game_id === "2048" && result.max_tile >= 2048 ? ["puzzle"] : []),
    ...(result.game_id === "shooter" && result.final_score >= 500
      ? ["space"]
      : []),
  ];
}
