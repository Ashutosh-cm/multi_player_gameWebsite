import { useEffect, useRef, useState } from "react";
import {
  addTile,
  newBoard,
  moveBoard,
  isGameOver,
  snakeStep,
  foodFor,
} from "./logic";
const keys = {
  ArrowUp: "up",
  w: "up",
  ArrowDown: "down",
  s: "down",
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
};
const vectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export function DPad({ onMove }) {
  return (
    <div className="dpad" aria-label="Movement controls">
      {[
        ["left", "←"],
        ["up", "↑"],
        ["down", "↓"],
        ["right", "→"],
      ].map(([d, label]) => (
        <button key={d} aria-label={d} onClick={() => onMove(d)}>
          {label}
        </button>
      ))}
    </div>
  );
}
export function Snake({ paused, onScore, onEnd }) {
  const canvas = useRef(),
    state = useRef({
      snake: [
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
      ],
      direction: vectors.right,
      next: vectors.right,
      food: { x: 14, y: 10 },
      score: 0,
      done: false,
    });
  const move = (d) => {
    const s = state.current,
      v = vectors[d];
    if (v.x !== -s.direction.x || v.y !== -s.direction.y) s.next = v;
  };
  useEffect(() => {
    const handler = (e) => {
      if (keys[e.key]) {
        e.preventDefault();
        if (!paused) move(keys[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paused]);
  useEffect(() => {
    function draw() {
      const c = canvas.current?.getContext("2d");
      if (!c) return;
      const s = state.current;
      c.fillStyle = "#11191c";
      c.fillRect(0, 0, 400, 400);
      c.strokeStyle = "#1b282c";
      for (let i = 0; i <= 20; i++) {
        c.beginPath();
        c.moveTo(i * 20, 0);
        c.lineTo(i * 20, 400);
        c.moveTo(0, i * 20);
        c.lineTo(400, i * 20);
        c.stroke();
      }
      c.fillStyle = "#ffb96c";
      c.shadowColor = "#ffb96c";
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(s.food.x * 20 + 10, s.food.y * 20 + 10, 6, 0, Math.PI * 2);
      c.fill();
      s.snake.forEach((p, i) => {
        c.fillStyle = i === 0 ? "#d6ff9a" : "#9deb62";
        c.shadowColor = "#a5ef68";
        c.shadowBlur = i === 0 ? 14 : 0;
        c.beginPath();
        c.roundRect(p.x * 20 + 2, p.y * 20 + 2, 16, 16, 4);
        c.fill();
      });
      c.shadowBlur = 0;
    }
    draw();
    const timer = setInterval(() => {
      const s = state.current;
      if (paused || s.done) return;
      s.direction = s.next;
      const next = snakeStep(s.snake, s.direction, s.food);
      if (next.dead) {
        s.done = true;
        onEnd(s.score);
        return;
      }
      s.snake = next.snake;
      if (next.ate) {
        s.score += 10;
        onScore(s.score);
        const food = foodFor(s.snake);
        if (!food) {
          s.done = true;
          onEnd(s.score);
          return;
        }
        s.food = food;
      }
      draw();
    }, 125);
    return () => clearInterval(timer);
  }, [paused, onEnd, onScore]);
  return (
    <>
      <canvas
        ref={canvas}
        width="400"
        height="400"
        aria-label="Snake game board"
      />
      <DPad onMove={(d) => !paused && move(d)} />
    </>
  );
}
export function Puzzle({ paused, onScore, onEnd, onState, initial }) {
  const [state, setState] = useState(
    () => initial || { board: newBoard(), score: 0 },
  );
  const current = useRef(state),
    touch = useRef();
  useEffect(() => {
    onState(state);
    onScore(state.score);
  }, [state, onState, onScore]);
  const move = (d) => {
    if (paused) return;
    const s = current.current,
      result = moveBoard(s.board, d);
    if (!result.changed) return;
    const next = {
      board: addTile(result.board),
      score: s.score + result.score,
    };
    current.current = next;
    setState(next);
    if (isGameOver(next.board)) onEnd(next.score, Math.max(...next.board));
  };
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    const handler = (e) => {
      if (keys[e.key]) {
        e.preventDefault();
        moveRef.current(keys[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <>
      <div
        className="puzzle"
        role="application"
        aria-label="2048 board"
        onTouchStart={(e) => {
          touch.current = [e.touches[0].clientX, e.touches[0].clientY];
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current[0],
            dy = e.changedTouches[0].clientY - touch.current[1];
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 20)
            move(
              Math.abs(dx) > Math.abs(dy)
                ? dx > 0
                  ? "right"
                  : "left"
                : dy > 0
                  ? "down"
                  : "up",
            );
          touch.current = null;
        }}
      >
        {state.board.map((v, i) => (
          <div
            key={i}
            className={`tile tile-${v}`}
            style={
              v >= 128
                ? {
                    background: `hsl(${36 - Math.min(Math.log2(v) * 2, 30)} 85% 58%)`,
                    color: "#20140a",
                  }
                : {}
            }
          >
            {v || ""}
          </div>
        ))}
      </div>
      <DPad onMove={move} />
    </>
  );
}
export function Shooter({ paused, onScore, onEnd }) {
  const canvas = useRef(),
    held = useRef({}),
    state = useRef({
      x: 200,
      y: 350,
      bullets: [],
      enemies: [],
      time: 0,
      spawn: 0,
      fire: 0,
      score: 0,
      lives: 3,
      done: false,
    });
  useEffect(() => {
    const down = (e) => {
        if (keys[e.key] || e.code === "Space") {
          e.preventDefault();
          held.current[keys[e.key] || "fire"] = true;
        }
      },
      up = (e) => {
        held.current[keys[e.key] || "fire"] = false;
      },
      blur = () => (held.current = {});
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (paused) held.current = {};
    let frame,
      last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      const s = state.current,
        c = canvas.current?.getContext("2d");
      if (!c) return;
      if (!paused && !s.done) {
        s.time += dt;
        s.spawn += dt;
        s.fire += dt;
        s.x = Math.max(
          12,
          Math.min(
            388,
            s.x +
              ((held.current.right ? 1 : 0) - (held.current.left ? 1 : 0)) *
                250 *
                dt,
          ),
        );
        s.y = Math.max(
          220,
          Math.min(
            380,
            s.y +
              ((held.current.down ? 1 : 0) - (held.current.up ? 1 : 0)) *
                250 *
                dt,
          ),
        );
        if (held.current.fire && s.fire > 0.17) {
          s.bullets.push({ x: s.x, y: s.y - 15 });
          s.fire = 0;
        }
        if (s.spawn > 0.7) {
          s.enemies.push({ x: 20 + Math.random() * 360, y: -15 });
          s.spawn = 0;
        }
        s.bullets.forEach((b) => (b.y -= 360 * dt));
        s.enemies.forEach((e) => (e.y += (75 + s.time * 1.7) * dt));
        for (const e of s.enemies) {
          for (const b of s.bullets) {
            if (
              !e.dead &&
              !b.dead &&
              Math.abs(e.x - b.x) < 16 &&
              Math.abs(e.y - b.y) < 18
            ) {
              e.dead = true;
              b.dead = true;
              s.score += 25;
              onScore(s.score);
            }
          }
          if (
            !e.dead &&
            (e.y > 410 ||
              (Math.abs(e.x - s.x) < 22 && Math.abs(e.y - s.y) < 22))
          ) {
            e.dead = true;
            s.lives--;
          }
        }
        s.bullets = s.bullets.filter((b) => !b.dead && b.y > -10);
        s.enemies = s.enemies.filter((e) => !e.dead);
        if (s.lives <= 0 || s.time >= 60) {
          s.done = true;
          onEnd(s.score);
        }
      }
      c.fillStyle = "#101325";
      c.fillRect(0, 0, 400, 400);
      for (let i = 0; i < 60; i++) {
        c.fillStyle = i % 3 ? "#414466" : "#b4b4df";
        c.fillRect((i * 137) % 400, (i * 71 + s.time * 20) % 400, 2, 2);
      }
      c.fillStyle = "#b6a2ff";
      c.beginPath();
      c.moveTo(s.x, s.y - 17);
      c.lineTo(s.x - 14, s.y + 13);
      c.lineTo(s.x, s.y + 6);
      c.lineTo(s.x + 14, s.y + 13);
      c.closePath();
      c.fill();
      c.fillStyle = "#a9ef71";
      s.bullets.forEach((b) => c.fillRect(b.x - 2, b.y, 4, 12));
      c.fillStyle = "#ed849f";
      s.enemies.forEach((e) => {
        c.beginPath();
        c.moveTo(e.x - 13, e.y - 10);
        c.lineTo(e.x + 13, e.y - 10);
        c.lineTo(e.x + 8, e.y + 8);
        c.lineTo(e.x, e.y + 14);
        c.lineTo(e.x - 8, e.y + 8);
        c.closePath();
        c.fill();
      });
      c.fillStyle = "#d8d5ed";
      c.font = "14px monospace";
      c.fillText(`LIVES ${Math.max(0, s.lives)} / 3`, 14, 24);
      c.fillText(`${Math.max(0, 60 - Math.floor(s.time))}s`, 350, 24);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, onEnd, onScore]);
  return (
    <>
      <canvas
        ref={canvas}
        width="400"
        height="400"
        aria-label="Space Shooter game board"
      />
      <div className="dpad">
        {[
          ["left", "←"],
          ["up", "↑"],
          ["down", "↓"],
          ["right", "→"],
          ["fire", "Fire"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-label={key}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              held.current[key] = true;
            }}
            onPointerUp={() => (held.current[key] = false)}
            onPointerCancel={() => (held.current[key] = false)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
