"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RubiksCube, { type CubeApi } from "@/components/RubiksCube";
import CornerButton from "@/components/CornerButton";
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
  const [centerHint, setCenterHint] = useState(false);
  const [solverReady, setSolverReady] = useState(false);
  const [solution, setSolution] = useState<Move[]>([]);
  const [step, setStep] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const cubeApi = useRef<CubeApi | null>(null);
  const handleCubeReady = useCallback((api: CubeApi | null) => {
    cubeApi.current = api;
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
      } else if (msg.type === "solution") {
        const moves = parseMoves(msg.moves);
        if (!moves.length) {
          setPhase("input");
          setError("That cube is already solved. Nothing to do!");
          return;
        }
        setSolution(moves);
        setStep(0);
        setPhase("guide");
      } else {
        setPhase("input");
        setError("The solver couldn't handle that cube. Double-check your colors and try again.");
      }
    };
    worker.postMessage({ type: "init" });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // The 3D cube starts in the user's scrambled state: solved, then the solution undone.
  const setupMoves = useMemo(() => invertMoves(solution), [solution]);

  const next = useCallback(() => {
    if (step >= solution.length) return;
    cubeApi.current?.enqueue(solution[step]);
    setStep(step + 1);
  }, [step, solution]);

  const prev = useCallback(() => {
    if (step <= 0) return;
    cubeApi.current?.enqueue(invertMove(solution[step - 1]));
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
    setFacelets((f) => {
      const copy = [...f];
      copy[i] = copy[i] === brush ? null : brush;
      return copy;
    });
    setError(null);
  };

  const solve = () => {
    const problem = validateFacelets(facelets);
    setError(problem);
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
            <CornerButton variant="secondary" onClick={prev} disabled={step === 0}>
              ← Back
            </CornerButton>
            <CornerButton variant="primary" onClick={next} disabled={done}>
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
              className="swatch"
              onClick={() => setBrush(c)}
            >
              <span className="swatch-dot" style={{ background: COLOR_HEX[c] }} aria-hidden="true" />
              {COLOR_NAME[c]}
              <span className="swatch-count">{counts[i]}/9</span>
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
          >
            Try an example
          </CornerButton>
          <CornerButton
            variant="secondary"
            onClick={() => {
              setFacelets(emptyFacelets());
              setError(null);
            }}
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
