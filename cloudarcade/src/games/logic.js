export function addTile(board, random = Math.random) {
  const empty = board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!empty.length) return board;
  const next = [...board];
  next[empty[Math.floor(random() * empty.length)]] = random() < 0.9 ? 2 : 4;
  return next;
}
export function newBoard() {
  return addTile(addTile(Array(16).fill(0)));
}
export function moveBoard(board, direction) {
  const out = [...board];
  let score = 0;
  for (let line = 0; line < 4; line++) {
    let ids = Array.from({ length: 4 }, (_, i) =>
      direction === "left" || direction === "right"
        ? line * 4 + i
        : i * 4 + line,
    );
    if (direction === "right" || direction === "down") ids.reverse();
    const vals = ids.map((i) => board[i]).filter(Boolean),
      merged = [];
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === vals[i + 1]) {
        merged.push(vals[i] * 2);
        score += vals[i] * 2;
        i++;
      } else merged.push(vals[i]);
    }
    ids.forEach((id, i) => (out[id] = merged[i] || 0));
  }
  return { board: out, score, changed: out.some((v, i) => v !== board[i]) };
}
export function isGameOver(board) {
  return ["left", "right", "up", "down"].every(
    (d) => !moveBoard(board, d).changed,
  );
}
export function validProgress(value) {
  return (
    value &&
    Array.isArray(value.board) &&
    value.board.length === 16 &&
    value.board.every(
      (v) =>
        Number.isInteger(v) &&
        v >= 0 &&
        v <= 131072 &&
        (v === 0 || (v >= 2 && Math.log2(v) % 1 === 0)),
    ) &&
    Number.isSafeInteger(value.score) &&
    value.score >= 0
  );
}
export function snakeStep(snake, direction, food, size = 20) {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const ate = head.x === food.x && head.y === food.y;
  const body = ate ? snake : snake.slice(0, -1);
  const dead =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= size ||
    head.y >= size ||
    body.some((p) => p.x === head.x && p.y === head.y);
  return { snake: [head, ...(ate ? snake : snake.slice(0, -1))], ate, dead };
}
export function foodFor(snake, size = 20) {
  const free = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
