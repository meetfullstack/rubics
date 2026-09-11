"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import CornerButton from "@/components/CornerButton";
import { FACES, type Face, type Move } from "@/lib/moves";

type Axis = "x" | "y" | "z";
const AXES: Axis[] = ["x", "y", "z"];

/** A layer rotation: `quarters` quarter-turns about the +axis (right-handed). */
type Turn = { axis: Axis; layer: -1 | 0 | 1; quarters: number };
type QueuedTurn = Turn & { record: boolean; fast: boolean };

const LAYERS: Record<Face, { axis: Axis; layer: 1 | -1 }> = {
  U: { axis: "y", layer: 1 },
  D: { axis: "y", layer: -1 },
  R: { axis: "x", layer: 1 },
  L: { axis: "x", layer: -1 },
  F: { axis: "z", layer: 1 },
  B: { axis: "z", layer: -1 },
};

// Friendly names for the control pad, in the order shown.
const SIDES: { face: Face; name: string }[] = [
  { face: "U", name: "Top" },
  { face: "F", name: "Front" },
  { face: "R", name: "Right" },
  { face: "L", name: "Left" },
  { face: "B", name: "Back" },
  { face: "D", name: "Bottom" },
];

// Clockwise as seen from outside the face = negative rotation for + faces.
const cwSign = (layer: number) => (layer === 1 ? -1 : 1);

const moveToTurn = (m: Move): Turn => {
  const { axis, layer } = LAYERS[m.face];
  return { axis, layer, quarters: m.double ? 2 : cwSign(layer) * (m.prime ? -1 : 1) };
};

const invertTurn = (t: Turn): Turn => ({ ...t, quarters: -t.quarters });

function turnLabel(t: Turn) {
  if (t.layer === 0) return "Middle";
  const face = FACES.find((f) => LAYERS[f].axis === t.axis && LAYERS[f].layer === t.layer)!;
  if (Math.abs(t.quarters) === 2) return `${face}2`;
  return `${face}${t.quarters === cwSign(t.layer) ? "" : "′"}`;
}

// Western scheme, white up / green front. Order matches BoxGeometry's
// material groups: +x -x +y -y +z -z.
const STICKERS = [0xb71234, 0xff5800, 0xffffff, 0xffd500, 0x009b48, 0x0046ad];
const NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

const QUARTER = Math.PI / 2;
const snap = (v: number) => Math.round(v / QUARTER) * QUARTER;
const DRAG_THRESHOLD = 12; // px before a sticker drag commits to a turn

export type CubeApi = {
  /** Animate a move (queued behind any in progress). */
  enqueue: (m: Move) => void;
  /** Apply moves immediately with no animation. */
  applyInstant: (moves: Move[]) => void;
  scramble: () => void;
  solve: () => void;
  reset: () => void;
};

type Props = {
  /** "full" = play controls, sticker dragging + keyboard; "hero" = self-playing
   *  decoration; "guide" = just the 3D view, driven through the api from onReady. */
  mode?: "full" | "hero" | "guide";
  /** Receives the cube's api once it's built (and null on teardown). Keep it stable. */
  onReady?: (api: CubeApi | null) => void;
  /** Moves applied instantly when the cube is built, to start from a given state. Keep it stable. */
  initialMoves?: Move[];
};

export default function RubiksCube({ mode = "full", onReady, initialMoves }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<CubeApi | null>(null);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scene ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(5.2, 4.4, 6.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "cube-canvas";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xa855f7, 25, 20);
    rim.position.set(-4, -2, -4);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // ── Cubies ──────────────────────────────────────────────────
    const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);
    const body = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5 });
    const stickerMats = STICKERS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35 }),
    );

    const cubies: THREE.Mesh[] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const outer = [x === 1, x === -1, y === 1, y === -1, z === 1, z === -1];
          const mesh = new THREE.Mesh(
            geometry,
            outer.map((isOuter, i) => (isOuter ? stickerMats[i] : body)),
          );
          mesh.position.set(x, y, z);
          mesh.userData.home = mesh.position.clone();
          root.add(mesh);
          cubies.push(mesh);
        }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 14;
    // Right-drag spins the view even over the cube (left-drag there turns a row).
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    if (mode === "hero") {
      controls.enableZoom = false;
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 1.2;
    }

    // ── Move engine ─────────────────────────────────────────────
    const queue: QueuedTurn[] = [];
    let history: Turn[] = [];
    let anim: {
      pivot: THREE.Group;
      axis: Axis;
      angle: number;
      t0: number;
      dur: number;
      turn: QueuedTurn;
    } | null = null;

    const isSolved = () => {
      const seen = new Map<string, THREE.Material>();
      const n = new THREE.Vector3();
      for (const c of cubies) {
        const mats = c.material as THREE.Material[];
        for (let i = 0; i < 6; i++) {
          if (mats[i] === body) continue;
          n.copy(NORMALS[i]).applyQuaternion(c.quaternion).round();
          const k = `${n.x},${n.y},${n.z}`;
          const prev = seen.get(k);
          if (prev && prev !== mats[i]) return false;
          seen.set(k, mats[i]);
        }
      }
      return true;
    };

    // Gathers one layer's cubies into a group that can be rotated as a unit.
    const makePivot = (t: Turn) => {
      const pivot = new THREE.Group();
      root.add(pivot);
      for (const c of cubies) {
        if (Math.round(c.position[t.axis]) === t.layer) pivot.attach(c);
      }
      return { pivot, axis: t.axis, angle: t.quarters * QUARTER };
    };

    // Completes a turn and hands the cubies back to the cube, snapped to the grid.
    const settle = (pivot: THREE.Group, axis: Axis, angle: number) => {
      pivot.rotation[axis] = angle;
      pivot.updateMatrixWorld();
      for (const c of [...pivot.children]) {
        root.attach(c);
        c.position.round();
        c.rotation.set(snap(c.rotation.x), snap(c.rotation.y), snap(c.rotation.z));
      }
      root.remove(pivot);
    };

    const startNext = () => {
      const turn = queue.shift();
      if (!turn) {
        setBusy(false);
        return;
      }
      const { pivot, axis, angle } = makePivot(turn);
      const half = Math.abs(turn.quarters) === 2;
      const dur = reduceMotion ? 0 : (turn.fast ? 90 : 220) * (half ? 1.5 : 1);
      anim = { pivot, axis, angle, t0: performance.now(), dur, turn };
      setBusy(true);
    };

    const finishMove = () => {
      if (!anim) return;
      const { pivot, axis, angle, turn } = anim;
      settle(pivot, axis, angle);
      anim = null;
      if (turn.record) {
        history.push({ axis: turn.axis, layer: turn.layer, quarters: turn.quarters });
        setMoves((m) => m + 1);
        setLast(turnLabel(turn));
      }
      setSolved(isSolved());
      startNext();
    };

    // Drops queued turns and completes the one in flight without animating.
    const flush = () => {
      queue.length = 0;
      if (anim) {
        settle(anim.pivot, anim.axis, anim.angle);
        anim = null;
      }
    };

    const enqueue = (t: Turn, record = true, fast = false) => {
      queue.push({ ...t, record, fast });
      if (!anim) startNext();
    };

    const randomTurns = (count: number) => {
      const out: Turn[] = [];
      let prev: Face | null = null;
      while (out.length < count) {
        const face = FACES[Math.floor(Math.random() * 6)];
        if (face === prev) continue;
        prev = face;
        out.push(moveToTurn({ face, prime: Math.random() < 0.5 }));
      }
      return out;
    };

    const api: CubeApi = {
      enqueue: (m) => enqueue(moveToTurn(m)),
      applyInstant: (list) => {
        flush();
        for (const m of list) {
          const { pivot, axis, angle } = makePivot(moveToTurn(m));
          settle(pivot, axis, angle);
        }
        setSolved(isSolved());
        setBusy(false);
      },
      scramble: () => {
        // Scramble turns aren't counted, but "solve" still has to undo them.
        const scramble = randomTurns(20);
        history.push(...scramble);
        for (const t of scramble) enqueue(t, false, true);
        setMoves(0);
        setLast(null);
      },
      // Rewinds every recorded turn — a replay, not a search-based solver.
      solve: () => {
        const undo = [...history].reverse().map(invertTurn);
        history = [];
        for (const t of undo) enqueue(t, false, true);
        setLast(null);
      },
      reset: () => {
        flush();
        history = [];
        for (const c of cubies) {
          c.position.copy(c.userData.home as THREE.Vector3);
          c.rotation.set(0, 0, 0);
        }
        setMoves(0);
        setLast(null);
        setSolved(true);
        setBusy(false);
      },
    };
    if (initialMoves?.length) api.applyInstant(initialMoves);
    apiRef.current = api;
    onReady?.(api);

    // ── Hero autoplay ───────────────────────────────────────────
    let autoplay: ReturnType<typeof setInterval> | undefined;
    if (mode === "hero" && !reduceMotion) {
      let pending: Turn[] = [];
      autoplay = setInterval(() => {
        if (anim || queue.length) return;
        // Alternate: a few random twists, then undo them back to solved.
        if (pending.length) {
          enqueue(invertTurn(pending.pop()!), false);
        } else if (isSolved()) {
          pending = randomTurns(6);
          for (const t of pending) enqueue(t, false);
        }
      }, 700);
    }

    // ── Sticker dragging (full mode) ────────────────────────────
    // Press on the cube and drag to turn that row/column; press on empty
    // space to orbit. The drag direction is matched to whichever in-plane
    // axis of the touched face it runs along on screen.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let drag: {
      id: number;
      x: number;
      y: number;
      normal: THREE.Vector3;
      point: THREE.Vector3;
      cubie: THREE.Object3D;
    } | null = null;

    const endDrag = () => {
      drag = null;
      controls.enabled = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(cubies, false)[0];
      if (!hit?.face) return; // empty space: let OrbitControls rotate the view
      const q = hit.object.getWorldQuaternion(new THREE.Quaternion());
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        normal: hit.face.normal.clone().applyQuaternion(q).round(),
        point: hit.point.clone(),
        cubie: hit.object,
      };
      // Runs before OrbitControls' own listener (capture), so it ignores this press.
      controls.enabled = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const dist = Math.hypot(dx, dy);
      if (dist < DRAG_THRESHOLD) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const toScreen = (v: THREE.Vector3) => {
        const p = v.clone().project(camera);
        return new THREE.Vector2(((p.x + 1) / 2) * rect.width, ((1 - p.y) / 2) * rect.height);
      };
      const origin = toScreen(drag.point);

      let best: { dir: THREE.Vector3; score: number } | null = null;
      for (const axis of AXES) {
        const dir = new THREE.Vector3();
        dir[axis] = 1;
        if (Math.abs(dir.dot(drag.normal)) > 0.5) continue; // not in the face plane
        const s = toScreen(drag.point.clone().add(dir)).sub(origin).normalize();
        const score = (dx * s.x + dy * s.y) / dist;
        if (!best || Math.abs(score) > Math.abs(best.score)) {
          best = { dir: dir.multiplyScalar(score < 0 ? -1 : 1), score };
        }
      }
      if (!best) return endDrag();

      // Rotating about normal × drag direction moves the touched sticker along the drag.
      const rot = new THREE.Vector3().crossVectors(drag.normal, best.dir).round();
      const axis = AXES.find((a) => rot[a] !== 0);
      if (axis) {
        const pos = drag.cubie.getWorldPosition(new THREE.Vector3());
        const layer = Math.max(-1, Math.min(1, Math.round(pos[axis]))) as -1 | 0 | 1;
        enqueue({ axis, layer, quarters: rot[axis] });
      }
      endDrag();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) endDrag();
    };

    const canvas = renderer.domElement;
    if (mode === "full") {
      canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }

    // ── Keyboard (full mode) ────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const face = e.code.replace("Key", "") as Face;
      if (!FACES.includes(face)) return;
      e.preventDefault();
      enqueue(moveToTurn({ face, prime: e.shiftKey }));
    };
    if (mode === "full") window.addEventListener("keydown", onKey);

    // ── Render loop & sizing ────────────────────────────────────
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let raf = 0;
    const tick = (now: number) => {
      if (anim) {
        const p = anim.dur ? Math.min((now - anim.t0) / anim.dur, 1) : 1;
        const eased = 1 - Math.pow(1 - p, 3);
        anim.pivot.rotation[anim.axis] = anim.angle * eased;
        if (p >= 1) finishMove();
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(autoplay);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKey);
      controls.dispose();
      geometry.dispose();
      body.dispose();
      stickerMats.forEach((m) => m.dispose());
      renderer.dispose();
      // dispose() alone keeps the WebGL context alive. Browsers cap live
      // contexts (~16) and silently kill the oldest — which froze the cube
      // after a few remounts — so release it explicitly.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      apiRef.current = null;
      onReady?.(null);
    };
  }, [mode, onReady, initialMoves]);

  if (mode === "hero") {
    return (
      <div
        ref={mountRef}
        className="cube-stage"
        role="img"
        aria-label="A 3D Rubik's cube twisting and untwisting itself"
      />
    );
  }

  if (mode === "guide") {
    return (
      <div className="card cube-stage">
        <div
          ref={mountRef}
          style={{ position: "absolute", inset: 0 }}
          role="img"
          aria-label="3D model of your cube, showing each solution move. Drag to look around."
        />
      </div>
    );
  }

  const api = () => apiRef.current;

  return (
    <div className="cube-layout">
      <div className="card cube-stage">
        <div
          ref={mountRef}
          style={{ position: "absolute", inset: 0 }}
          role="img"
          aria-label="Interactive 3D Rubik's cube. Drag a sticker to turn its row, right-drag or drag the background to rotate the view, or use the turn buttons."
        />
        <div className="cube-status" aria-hidden="true">
          <span className="tag">Moves · {moves}</span>
          {last && <span className="tag">Last · {last}</span>}
          <span className="tag">{solved ? "Solved ✓" : "Scrambled"}</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {solved ? "Cube solved." : ""}
        </p>
      </div>

      <aside className="card cube-panel" aria-label="Cube controls">
        <div>
          <p className="panel-label">How to play</p>
          <ul className="help-list">
            <li>
              <strong>Drag a sticker</strong> to turn its row, just like a real cube
            </li>
            <li>
              <strong>Right-click and drag</strong> (or drag the background) to spin the cube and
              see other sides
            </li>
          </ul>
        </div>

        <div className="panel-actions">
          <CornerButton variant="primary" onClick={() => api()?.scramble()} disabled={busy}>
            Scramble
          </CornerButton>
          <CornerButton
            variant="secondary"
            onClick={() => api()?.solve()}
            disabled={busy || solved}
          >
            Solve
          </CornerButton>
          <CornerButton variant="secondary" onClick={() => api()?.reset()}>
            Reset
          </CornerButton>
        </div>

        <div>
          <p className="panel-label">Or use buttons</p>
          <div className="side-pad">
            {SIDES.map(({ face, name }) => (
              <div key={face} className="side-row">
                <span className="side-name">{name}</span>
                <button
                  type="button"
                  className="move-btn"
                  onClick={() => api()?.enqueue({ face, prime: true })}
                  aria-label={`Turn ${name.toLowerCase()} side counter-clockwise`}
                  title="Counter-clockwise"
                >
                  ↺
                </button>
                <button
                  type="button"
                  className="move-btn"
                  onClick={() => api()?.enqueue({ face, prime: false })}
                  aria-label={`Turn ${name.toLowerCase()} side clockwise`}
                  title="Clockwise"
                >
                  ↻
                </button>
              </div>
            ))}
          </div>
          <p className="guide-hint" style={{ marginTop: "0.75rem" }}>
            Arrows show the turn as if you&rsquo;re looking straight at that side. Keyboard:{" "}
            <span className="kbd">U</span> <span className="kbd">D</span>{" "}
            <span className="kbd">L</span> <span className="kbd">R</span>{" "}
            <span className="kbd">F</span> <span className="kbd">B</span>, hold{" "}
            <span className="kbd">Shift</span> to reverse.
          </p>
        </div>
      </aside>
    </div>
  );
}
