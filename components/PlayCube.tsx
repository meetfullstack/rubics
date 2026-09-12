"use client";

import dynamic from "next/dynamic";
import { useDelayedTrue } from "@/lib/useDelayedTrue";

// Splits the three.js engine into its own chunk so the page and its "How to
// play" text render immediately — the cube and controls pop in once that
// chunk arrives. The fallback mirrors RubiksCube's own "full" mode markup
// (cube-layout grid + stage + panel) so there's no layout jump when it swaps in.
const RubiksCube = dynamic(() => import("./RubiksCube"), {
  ssr: false,
  loading: () => <PlaySkeleton />,
});

function PlaySkeleton() {
  // Only shows the pulsing placeholder once loading has taken a moment —
  // on a fast connection this resolves before the delay, so nothing flashes.
  const show = useDelayedTrue();
  return (
    <div className="cube-layout">
      <div className={`card cube-stage cube-skeleton-stage${show ? " is-loading" : ""}`} role="status">
        <span className="sr-only">Loading 3D cube…</span>
      </div>
      <aside
        className={`card cube-panel cube-skeleton-panel${show ? " is-loading" : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}

export default function PlayCube() {
  return <RubiksCube />;
}
