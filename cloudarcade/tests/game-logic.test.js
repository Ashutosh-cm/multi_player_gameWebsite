import test from "node:test";
import assert from "node:assert/strict";
import {
  moveBoard,
  isGameOver,
  addTile,
  snakeStep,
  foodFor,
  validProgress,
} from "../src/games/logic.js";
import { earnedBadges } from "../src/catalog.js";
test("2048 merges each tile only once and calculates points", () => {
  const r = moveBoard([2, 2, 2, 2, ...Array(12).fill(0)], "left");
  assert.deepEqual(r.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(r.score, 8);
});
test("2048 handles directional order and leaves input untouched", () => {
  const b = [2, 2, 4, 0, ...Array(12).fill(0)],
    r = moveBoard(b, "right");
  assert.deepEqual(r.board.slice(0, 4), [0, 0, 4, 4]);
  assert.equal(b[0], 2);
  const down = moveBoard([2, 0, 0, 0, 2, 0, 0, 0, ...Array(8).fill(0)], "down");
  assert.equal(down.board[12], 4);
});
test("2048 detects valid moves on a full board", () => {
  const b = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(isGameOver(b), true);
  b[0] = 4;
  assert.equal(isGameOver(b), false);
});
test("2048 adds one tile only to empty cells", () => {
  const b = Array(16).fill(4);
  b[3] = 0;
  const next = addTile(b, () => 0);
  assert.equal(next[3], 2);
  assert.equal(next.filter((v) => v === 4).length, 15);
  assert.equal(b[3], 0);
});
test("saved puzzle validation rejects corrupt data", () => {
  assert.ok(validProgress({ board: Array(16).fill(2), score: 0 }));
  assert.ok(!validProgress({ board: [2], score: 0 }));
  assert.ok(!validProgress({ board: Array(16).fill(3), score: 0 }));
  assert.ok(!validProgress({ board: Array(16).fill(1), score: 0 }));
  assert.ok(!validProgress({ board: Array(16).fill(2), score: -1 }));
});
test("Snake detects walls and grows after food", () => {
  assert.ok(snakeStep([{ x: 0, y: 0 }], { x: -1, y: 0 }, { x: 5, y: 5 }).dead);
  const s = snakeStep(
    [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ],
    { x: 1, y: 0 },
    { x: 3, y: 2 },
  );
  assert.ok(s.ate);
  assert.equal(s.snake.length, 3);
  assert.equal(s.dead, false);
});
test("Snake permits moving into a departing tail", () => {
  const s = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 1 },
  ];
  assert.equal(snakeStep(s, { x: -1, y: 0 }, { x: 5, y: 5 }).dead, false);
  assert.equal(snakeStep(s, { x: 0, y: 1 }, { x: 5, y: 5 }).dead, true);
});
test("food never spawns on a snake and full boards terminate", () => {
  const s = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  assert.deepEqual(foodFor(s, 2), { x: 1, y: 1 });
  assert.equal(foodFor([...s, { x: 1, y: 1 }], 2), null);
});
test("achievements compare against prior game-specific records", () => {
  const old = [{ game_id: "snake", final_score: 20 }];
  const ids = earnedBadges(old, { game_id: "snake", final_score: 100 });
  assert.ok(ids.includes("first"));
  assert.ok(ids.includes("hundred"));
  assert.ok(ids.includes("best"));
  assert.ok(!ids.includes("five"));
  assert.ok(
    !earnedBadges(old, {
      game_id: "2048",
      final_score: 100,
      max_tile: 8,
    }).includes("best"),
  );
});
