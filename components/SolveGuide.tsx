"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CubeApi } from "@/components/RubiksCube";
import CornerButton from "@/components/CornerButton";
import { useDelayedTrue } from "@/lib/useDelayedTrue";
import {
  COLORS,
  COLOR_HEX,
  COLOR_NAME,
  FACE_LABEL,
  emptyFacelets,
  isCenter,
  validateFacelets,
  type Color,
  type Facelets,
} from "@/lib/facelets";
import {
  describeMove,
  invertMove,
  invertMoves,
  moveLabel,
  parseMoves,
  type Move,
} from "@/lib/moves";
import type { SolverResponse } from "@/lib/solver.worker";

// Splits the three.js engine into its own chunk so this page's color-entry
// UI renders immediately — the cube pops in once that chunk arrives (only
// needed once the user reaches the guide phase).
const RubiksCube = dynamic(() => import("@/components/RubiksCube"), {
  ssr: false,
  loading: () => <GuideCubeSkeleton />,
});

function GuideCubeSkeleton() {
  // Only shows the pulsing placeholder once loading has taken a moment —
  // on a fast connection this resolves before the delay, so nothing flashes.
  const show = useDelayedTrue();
  return (
    <div className={`card cube-stage cube-skeleton-stage${show ? " is-loading" : ""}`} role="status">
      <span className="sr-only">Loading 3D cube…</span>
    </div>
  );
}

type Phase = "input" | "solving" | "guide";

// Where each face sits on the unfolded net (grid row, grid column).
const NET_POS: Record<Color, [number, number]> = {
  U: [1, 4],
  L: [4, 1],
  F: [4, 4],
  R: [4, 7],
  B: [4, 10],
  D: [7, 4],
};

// Label text on the center stickers — dark on the light colors.
const CENTER_TEXT: Record<Color, string> = {
  U: "#111",
  D: "#111",
  R: "#fff",
  F: "#fff",
  L: "#fff",
  B: "#fff",
};

export default function SolveGuide() {
  const [facelets, setFacelets] = useState<Facelets>(emptyFacelets);
  const [brush, setBrush] = useState<Color>("U");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  // Good news, not a mistake — shown like .notice--info rather than an alert.
  const [info, setInfo] = useState<string | null>(null);
  const [centerHint, setCenterHint] = useState(false);
  const [solverReady, setSolverReady] = useState(false);
  const [solution, setSolution] = useState<Move[]>([]);
  const [step, setStep] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const cubeApi = useRef<CubeApi | null>(null);
  const [cubeReady, setCubeReady] = useState(false);
  const handleCubeReady = useCallback((api: CubeApi | null) => {
    cubeApi.current = api;
    setCubeReady(api !== null);
  }, []);

  // Start the solver right away so its tables are built while the user paints.
  useEffect(() => {
    const worker = new Worker(new URL("../lib/solver.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<SolverResponse>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        setSolverReady(true);
      } else if (msg.type === "random") {
        setFacelets(msg.facelets.split("") as Color[]);
        setError(null);
        setInfo(null);
      } else if (msg.type === "solution") {
        const moves = parseMoves(msg.moves);
        if (!moves.length) {
          setPhase("input");
          setError(null);
          setInfo("😄 It's already solved! Nothing to do here.");
          return;
        }
        setSolution(moves);
        setStep(0);
        setPhase("guide");
      } else {
        setPhase("input");
        setInfo(null);
        setError("The solver couldn't handle that cube. Double-check your colors and try again.");
      }
    };
    // A worker that throws instead of replying would otherwise leave the UI
    // stuck on "Solving…" forever with no way out.
    worker.onerror = () => {
      setPhase("input");
      setInfo(null);
      setError("Something went wrong solving that cube. Please try again.");
    };
    worker.postMessage({ type: "init" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // The 3D cube starts in the user's scrambled state: solved, then the solution undone.
  const setupMoves = useMemo(() => invertMoves(solution), [solution]);

  const next = useCallback(() => {
    // The cube's chunk may still be loading (see the dynamic() import
    // above) — without this guard, clicking here first would advance the
    // step counter with no matching move applied once the cube did mount.
    if (step >= solution.length || !cubeApi.current) return;
    cubeApi.current.enqueue(solution[step]);
    setStep(step + 1);
  }, [step, solution]);

  const prev = useCallback(() => {
    if (step <= 0 || !cubeApi.current) return;
    cubeApi.current.enqueue(invertMove(solution[step - 1]));
    setStep(step - 1);
  }, [step, solution]);

  // Arrow keys step through the guide.
  useEffect(() => {
    if (phase !== "guide") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next, prev]);

  const paint = (i: number) => {
    if (isCenter(i)) {
      setCenterHint(true);
      return;
    }
    setCenterHint(false);

    setInfo(null);

    if (facelets[i] === brush) {
      // Clicking a sticker that already has the selected color clears it.
      const copy = [...facelets];
      copy[i] = null;
      setFacelets(copy);
      setError(null);
      return;
    }

    // Every color can only cover 9 stickers (1 fixed center + 8 more) — a
    // real cube can't have a 10th, so stop here instead of letting the
    // count go higher, and tell the user to switch colors or clear one first.
    const brushCount = facelets.filter((c) => c === brush).length;
    if (brushCount >= 9) {
      setError(
        `You've already placed all 9 ${COLOR_NAME[brush].toLowerCase()} stickers. Choose a different color, or clear one first.`,
      );
      return;
    }

    const copy = [...facelets];
    copy[i] = brush;
    setFacelets(copy);
    setError(null);
  };

  const solve = () => {
    const problem = validateFacelets(facelets);
    setError(problem);
    setInfo(null);
    if (problem) return;
    setPhase("solving");
    workerRef.current?.postMessage({ type: "solve", facelets: facelets.join("") });
  };

  if (phase === "guide") {
    const done = step === solution.length;
    const current = solution[step];
    return (
      <div className="cube-layout">
        <RubiksCube mode="guide" onReady={handleCubeReady} initialMoves={setupMoves} />

        <aside className="card cube-panel" aria-label="Solution steps">
          <div aria-live="polite">
            <p className="panel-label">
              {done ? "All done" : `Step ${step + 1} of ${solution.length}`}
            </p>
            {done ? (
              <>
                <p className="guide-move accent-text">Solved!</p>
                <p className="guide-desc">Your cube should now be solved. Nice work.</p>
              </>
            ) : (
              <>
                <p className="guide-move">{moveLabel(current)}</p>
                <p className="guide-desc">{describeMove(current)}.</p>
              </>
            )}
          </div>

          <div className="panel-actions">
            <CornerButton variant="secondary" onClick={prev} disabled={step === 0 || !cubeReady}>
              ← Back
            </CornerButton>
            <CornerButton variant="primary" onClick={next} disabled={done || !cubeReady}>
              Next →
            </CornerButton>
          </div>

          <p className="guide-hint">
            Keep <strong>white on top</strong> and <strong>green facing you</strong> the whole
            time. &ldquo;Clockwise&rdquo; means clockwise as if you were looking straight at that
            face. You can also use the <span className="kbd">←</span>{" "}
            <span className="kbd">→</span> keys.
          </p>

          <div>
            <p className="panel-label">Full solution · {solution.length} moves</p>
            <ol className="step-list">
              {solution.map((m, i) => (
                <li
                  key={i}
                  className={`step-chip${i < step ? " is-done" : ""}${i === step ? " is-current" : ""}`}
                  aria-current={i === step ? "step" : undefined}
                >
                  {moveLabel(m)}
                </li>
              ))}
            </ol>
          </div>

          <div className="panel-actions">
            <CornerButton
              variant="secondary"
              onClick={() => {
                setPhase("input");
                setError(null);
              }}
            >
              Edit colors
            </CornerButton>
          </div>
        </aside>
      </div>
    );
  }

  const counts = COLORS.map((c) => facelets.filter((x) => x === c).length);

  return (
    <div className="solve-layout">
      <div className="card solve-main">
        <div className="palette" role="radiogroup" aria-label="Paint color">
          {COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={brush === c}
              className={`swatch${counts[i] >= 9 ? " swatch--full" : ""}`}
              onClick={() => setBrush(c)}
            >
              <span className="swatch-dot" style={{ background: COLOR_HEX[c] }} aria-hidden="true" />
              {COLOR_NAME[c]}
              <span className="swatch-count">
                {counts[i]}/9{counts[i] >= 9 && <span aria-hidden="true"> ✓</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="net">
          {COLORS.map((face, fi) => {
            const [row, col] = NET_POS[face];
            return (
              <div
                key={face}
                role="group"
                aria-label={`${FACE_LABEL[face]} face`}
                className="net-face"
                style={{ gridRow: `${row} / span 3`, gridColumn: `${col} / span 3` }}
              >
                {Array.from({ length: 9 }, (_, k) => {
                  const i = fi * 9 + k;
                  const color = facelets[i];
                  const center = k === 4;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`sticker${color ? "" : " sticker--empty"}`}
                      style={
                        color
                          ? { background: COLOR_HEX[color], color: CENTER_TEXT[color] }
                          : undefined
                      }
                      aria-disabled={center || undefined}
                      onClick={() => paint(i)}
                      title={center ? "Centers are fixed. Hold your cube white-up, green-front." : undefined}
                      aria-label={`${FACE_LABEL[face]} face, row ${Math.floor(k / 3) + 1}, column ${(k % 3) + 1}: ${color ? COLOR_NAME[color] : "blank"}${center ? " (fixed center)" : ""}`}
                    >
                      {center && <span aria-hidden="true">{FACE_LABEL[face]}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="card cube-panel" aria-label="Instructions">
        <div>
          <p className="panel-label">How to enter your cube</p>
          <ol className="help-list help-list--numbered">
            <li>
              Hold your cube with the <strong>white</strong> center on top and the{" "}
              <strong>green</strong> center facing you. The labelled centers are already filled in
              to match.
            </li>
            <li>Pick a color, then tap stickers to paint them. Tap again to clear one.</li>
            <li>
              <strong>Front, Right, Back, Left:</strong> turn the whole cube (white stays on top)
              and copy each face exactly as you see it.
            </li>
            <li>
              <strong>Top:</strong> look down at it. The row touching the green side goes at the
              bottom.
            </li>
            <li>
              <strong>Bottom:</strong> tip the cube up to see it. The row touching the green side
              goes at the top.
            </li>
          </ol>
        </div>

        {centerHint && (
          <p className="notice notice--info" role="status">
            Center stickers can&rsquo;t be changed, and that&rsquo;s on purpose: centers never move
            relative to each other (white is always opposite yellow, green opposite blue). Just hold
            your cube with <strong>white on top</strong> and <strong>green facing you</strong> and
            every center will match.
          </p>
        )}

        {info && (
          <p className="notice notice--info" role="status">
            {info}
          </p>
        )}

        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        <div className="panel-actions">
          <CornerButton variant="primary" onClick={solve} disabled={phase === "solving"}>
            {phase === "solving" ? "Solving…" : "Solve my cube"}
          </CornerButton>
          <CornerButton
            variant="secondary"
            onClick={() => workerRef.current?.postMessage({ type: "random" })}
            // Changing the cube out from under a pending solve would apply
            // its result to whatever's on screen by the time it replies.
            disabled={phase === "solving"}
          >
            Try an example
          </CornerButton>
          <CornerButton
            variant="secondary"
            onClick={() => {
              setFacelets(emptyFacelets());
              setError(null);
              setInfo(null);
            }}
            disabled={phase === "solving"}
          >
            Clear
          </CornerButton>
        </div>

        <p className="guide-hint" aria-live="polite">
          {phase === "solving"
            ? solverReady
              ? "Finding a short solution…"
              : "Warming up the solver (first time only)…"
            : solverReady
              ? "Solver ready."
              : "Warming up the solver…"}
        </p>
      </aside>
    </div>
  );
}
