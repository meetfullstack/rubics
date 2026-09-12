"use client";

import { useEffect, useRef } from "react";

const CUBE_SIZE_MIN = 10;
const CUBE_SIZE_RANGE = 14;
const AREA_PER_CUBE = 2600; // px² of canvas per twinkling cube — controls density
const GLOW_RADIUS = 170; // px around the pointer that brightens cubes
const GLOW_PEAK = 0.6; // extra alpha added at the pointer's exact center

// The hero is two columns (headline+buttons on the left, the 3D cube on the
// right) — a single radial vignette centered on the whole section left both
// columns sitting inside its "visible" ring, so hovering near the text or
// the cube could still light up a cube right behind them. A frame-shaped
// vignette (distance to the NEAREST edge, not distance from one center
// point) instead stays clear across the whole middle strip regardless of
// which column something's in, and only lights up near the true edges.
const EDGE_INNER = 0.22; // fully visible within this fraction of the way in from an edge
const EDGE_OUTER = 0.62; // fully suppressed beyond this fraction of the way in

/** 0 across the broad middle (spanning both columns), 1 near the outer edges. */
function edgeWeight(x: number, y: number, w: number, h: number) {
  const nearest = Math.min(x, w - x, y, h - y);
  const t = nearest / (Math.min(w, h) / 2); // 0 at an edge, 1 at the center
  if (t <= EDGE_INNER) return 1;
  if (t >= EDGE_OUTER) return 0;
  return 1 - (t - EDGE_INNER) / (EDGE_OUTER - EDGE_INNER);
}

// Isometric cube palette: [top, left, right] face shades, light→dark, per theme.
const DARK_SHADES: [string, string, string][] = [
  ["rgba(196,132,252,ALPHA)", "rgba(168,85,247,ALPHA)", "rgba(124,58,237,ALPHA)"],
  ["rgba(168,85,247,ALPHA)", "rgba(139,92,246,ALPHA)", "rgba(109,40,217,ALPHA)"],
];
const LIGHT_SHADES: [string, string, string][] = [
  ["rgba(216,180,254,ALPHA)", "rgba(168,85,247,ALPHA)", "rgba(126,34,206,ALPHA)"],
  ["rgba(196,132,252,ALPHA)", "rgba(147,51,234,ALPHA)", "rgba(107,33,168,ALPHA)"],
];

type Cube = {
  x: number;
  y: number;
  size: number;
  shade: [string, string, string];
  peak: number; // brightest alpha this cube reaches
  phase: number; // radians, randomizes where in its cycle it starts
  rate: number; // radians per ms
  edge: number; // this cube's fixed edgeWeight (position never changes)
};

/** Draws one small isometric cube (3 diamond faces) centered at (cx, cy). */
function drawCube(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  alpha: number,
  shade: [string, string, string],
) {
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
 * A field of tiny cubes that twinkle in place — like a star field, but each
 * "star" is a little isometric cube. Shaped to a frame-style vignette (see
 * edgeWeight above) so it lights up near the hero's outer edges and stays
 * clear across the middle, where the headline and 3D cube sit. Cubes near
 * the pointer glow brighter, on top of their own ambient twinkle.
 */
export default function CubeVignette() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cubes: Cube[] = [];
    let raf: number;
    let lastDark = document.documentElement.classList.contains("dark");
    // Miles off-canvas so nothing glows until the pointer actually enters.
    const pointer = { x: -9999, y: -9999 };

    function makeCubes(dark: boolean) {
      const shades = dark ? DARK_SHADES : LIGHT_SHADES;
      const w = canvas!.width;
      const h = canvas!.height;
      const count = Math.max(24, Math.floor((w * h) / AREA_PER_CUBE));
      return Array.from({ length: count }, () => {
        // Re-roll a spawn that lands too deep in the always-clear center —
        // otherwise part of the cube budget just never renders anything.
        let x = 0;
        let y = 0;
        let edge = 0;
        for (let attempt = 0; attempt < 6 && edge <= 0; attempt++) {
          x = Math.random() * w;
          y = Math.random() * h;
          edge = edgeWeight(x, y, w, h);
        }
        return {
          x,
          y,
          edge,
          size: CUBE_SIZE_MIN + Math.random() * CUBE_SIZE_RANGE,
          shade: shades[Math.floor(Math.random() * shades.length)],
          peak: 0.45 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          // Full twinkle cycles every ~1.4-3s — brisker, more like an actual blink.
          rate: (Math.PI * 2) / (1400 + Math.random() * 1600),
        };
      });
    }

    function render(now: number, dark: boolean) {
      ctx!.fillStyle = dark ? "#000000" : "#f5f5f7";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      for (const c of cubes) {
        if (c.edge <= 0) continue;

        // Rests at near-invisible between twinkles and snaps up quickly
        // (wave**4, not **2) rather than breathing in and out smoothly —
        // reads as a sharp star-like blink instead of a slow pulse.
        const wave = Math.max(0, Math.sin(now * c.rate + c.phase));
        const w2 = wave * wave;
        let alpha = w2 * w2 * c.peak;

        const dist = Math.hypot(c.x - pointer.x, c.y - pointer.y);
        const proximity = Math.max(0, 1 - dist / GLOW_RADIUS);
        if (proximity > 0) alpha = Math.min(1, alpha + proximity * proximity * GLOW_PEAK);

        // Suppressed across the middle regardless of any glow boost (see
        // edgeWeight above) — this is what stops a hover glow from lighting
        // up a cube sitting behind the headline or the 3D cube.
        alpha *= c.edge;

        if (alpha <= 0.01) continue;
        if (proximity > 0.12) {
          ctx!.shadowColor = "rgba(168,85,247,0.9)";
          ctx!.shadowBlur = 16 * proximity;
        }
        drawCube(ctx!, c.x, c.y, c.size, Number(alpha.toFixed(3)), c.shade);
        if (proximity > 0.12) ctx!.shadowBlur = 0;
      }
    }

    function syncSize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const dark = document.documentElement.classList.contains("dark");
      cubes = makeCubes(dark);
      render(0, dark);
    }

    syncSize();
    window.addEventListener("resize", syncSize);

    // The canvas itself is pointer-events:none (so it never blocks the
    // hero's real content), so listen on its parent — the .hero section —
    // and translate to canvas-local coordinates via its own bounding rect.
    const host = canvas.parentElement;
    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      // No render loop under reduced motion, so redraw on move directly.
      if (reduceMotion) render(performance.now(), document.documentElement.classList.contains("dark"));
    }
    function onPointerLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
      if (reduceMotion) render(performance.now(), document.documentElement.classList.contains("dark"));
    }
    host?.addEventListener("pointermove", onPointerMove);
    host?.addEventListener("pointerleave", onPointerLeave);

    if (reduceMotion) {
      return () => {
        window.removeEventListener("resize", syncSize);
        host?.removeEventListener("pointermove", onPointerMove);
        host?.removeEventListener("pointerleave", onPointerLeave);
      };
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      if (!canvas || !ctx) return;
      const dark = document.documentElement.classList.contains("dark");
      if (dark !== lastDark) {
        lastDark = dark;
        cubes = makeCubes(dark);
      }
      render(now, dark);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncSize);
      host?.removeEventListener("pointermove", onPointerMove);
      host?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" role="presentation" className="cube-vignette" />;
}
