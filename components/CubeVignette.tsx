"use client";

import { useEffect, useRef } from "react";

const CUBE_SIZE_MIN = 10;
const CUBE_SIZE_RANGE = 14;
const AREA_PER_CUBE = 5500; // px² of canvas per twinkling cube — controls density
const GLOW_RADIUS = 170; // px around the pointer that brightens cubes
const GLOW_PEAK = 0.6; // extra alpha added at the pointer's exact center

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
 * "star" is a little isometric cube. Masked to a vignette (see .cube-vignette
 * in globals.css) so it frames the hero's edges/corners and fades away
 * around the headline and 3D cube in the middle. Cubes near the pointer glow
 * brighter, on top of their own ambient twinkle.
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
      const count = Math.max(12, Math.floor((canvas!.width * canvas!.height) / AREA_PER_CUBE));
      return Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        size: CUBE_SIZE_MIN + Math.random() * CUBE_SIZE_RANGE,
        shade: shades[Math.floor(Math.random() * shades.length)],
        peak: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        // Full twinkle cycles every ~3-7s.
        rate: (Math.PI * 2) / (3000 + Math.random() * 4000),
      }));
    }

    function render(now: number, dark: boolean) {
      ctx!.fillStyle = dark ? "#000000" : "#f5f5f7";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      for (const c of cubes) {
        // Rests at near-invisible between twinkles, rather than oscillating
        // symmetrically dim→bright→dim — reads as an occasional glint.
        const wave = Math.max(0, Math.sin(now * c.rate + c.phase));
        let alpha = wave * wave * c.peak;

        const dist = Math.hypot(c.x - pointer.x, c.y - pointer.y);
        const proximity = Math.max(0, 1 - dist / GLOW_RADIUS);
        if (proximity > 0) alpha = Math.min(1, alpha + proximity * proximity * GLOW_PEAK);

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
