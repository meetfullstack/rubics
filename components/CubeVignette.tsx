"use client";

import { useEffect, useRef } from "react";

const CUBE_SIZE = 18;
const GAP = 34;
// Each cube's per-tick fall distance, as a multiple of its own size. Kept
// >= 1 so successive draws in a column don't overlap into a smeared streak
// (the fade below is what would otherwise be the only separation) — each
// cube should read as a distinct shape with visible gaps around it.
const MIN_SPEED = 1;
const SPEED_RANGE = 1;
const MIN_ALPHA = 0.18;
const ALPHA_RANGE = 0.22;

// Isometric cube palette: [top, left, right] face shades, light→dark, per theme.
const DARK_SHADES: [string, string, string][] = [
  ["rgba(196,132,252,ALPHA)", "rgba(168,85,247,ALPHA)", "rgba(124,58,237,ALPHA)"],
  ["rgba(168,85,247,ALPHA)", "rgba(139,92,246,ALPHA)", "rgba(109,40,217,ALPHA)"],
];
const LIGHT_SHADES: [string, string, string][] = [
  ["rgba(216,180,254,ALPHA)", "rgba(168,85,247,ALPHA)", "rgba(126,34,206,ALPHA)"],
  ["rgba(196,132,252,ALPHA)", "rgba(147,51,234,ALPHA)", "rgba(107,33,168,ALPHA)"],
];

type Drop = { y: number; speed: number; shade: [string, string, string]; alpha: number };

/** Draws one small isometric cube (3 diamond faces) centered at (cx, cy). */
function drawCube(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, alpha: number, shade: [string, string, string]) {
  const h = s / 2;
  const [top, left, right] = shade;

  ctx.fillStyle = top.replace("ALPHA", String(alpha));
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + h, cy - h / 2);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - h, cy - h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = left.replace("ALPHA", String(alpha));
  ctx.beginPath();
  ctx.moveTo(cx - h, cy - h / 2);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - h, cy + h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = right.replace("ALPHA", String(alpha));
  ctx.beginPath();
  ctx.moveTo(cx + h, cy - h / 2);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx + h, cy + h / 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * A "digital rain" of tiny falling cubes, like the portfolio's MatrixRain but
 * cube-shaped — masked to a vignette so it frames the hero's edges/corners
 * and fades away around the headline and 3D cube in the middle.
 */
export default function CubeVignette() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let columns: Drop[] = [];
    let raf: number;
    let lastTime = 0;

    let lastDark = document.documentElement.classList.contains("dark");
    let settled = false;

    function solidFill(dark: boolean) {
      ctx!.fillStyle = dark ? "#000000" : "#f5f5f7";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    }

    function makeColumns(dark: boolean) {
      const shades = dark ? DARK_SHADES : LIGHT_SHADES;
      const count = Math.max(1, Math.floor(canvas!.width / GAP));
      return Array.from({ length: count }, () => ({
        y: Math.random() * -canvas!.height,
        speed: MIN_SPEED + Math.random() * SPEED_RANGE,
        shade: shades[Math.floor(Math.random() * shades.length)],
        alpha: MIN_ALPHA + Math.random() * ALPHA_RANGE,
      }));
    }

    function syncSize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const dark = document.documentElement.classList.contains("dark");
      solidFill(dark);
      columns = makeColumns(dark);
    }

    syncSize();
    window.addEventListener("resize", syncSize);

    if (reduceMotion) {
      return () => window.removeEventListener("resize", syncSize);
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (now - lastTime < 66) return; // ~15 fps, matches MatrixRain's pace
      lastTime = now;

      if (!canvas || !ctx) return;
      const dark = document.documentElement.classList.contains("dark");

      if (!settled) {
        settled = true;
        lastDark = dark;
      } else if (dark !== lastDark) {
        lastDark = dark;
        solidFill(dark);
        columns = makeColumns(dark);
        return;
      }

      ctx.fillStyle = dark ? "rgba(0,0,0,0.22)" : "rgba(245,245,247,0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      columns.forEach((drop, i) => {
        const x = i * GAP + GAP / 2;
        drawCube(ctx, x, drop.y, CUBE_SIZE, drop.alpha, drop.shade);
        drop.y += drop.speed * CUBE_SIZE;
        if (drop.y - CUBE_SIZE > canvas.height && Math.random() > 0.92) {
          drop.y = -CUBE_SIZE;
          drop.speed = MIN_SPEED + Math.random() * SPEED_RANGE;
          drop.alpha = MIN_ALPHA + Math.random() * ALPHA_RANGE;
        }
      });
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      className="cube-vignette"
    />
  );
}
