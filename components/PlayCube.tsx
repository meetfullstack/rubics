"use client";

import dynamic from "next/dynamic";

// Splits the three.js engine into its own chunk so the page and its "How to
// play" text render immediately — the cube and controls pop in once that
// chunk arrives. The fallback mirrors RubiksCube's own "full" mode markup
// (cube-layout grid + stage + panel) so there's no layout jump when it swaps in.
const RubiksCube = dynamic(() => import("./RubiksCube"), {
  ssr: false,
  loading: () => (
    <div className="cube-layout">
      <div className="card cube-stage cube-skeleton-stage" role="status">
        <span className="sr-only">Loading 3D cube…</span>
      </div>
      <aside className="card cube-panel cube-skeleton-panel" aria-hidden="true" />
    </div>
  ),
});

export default function PlayCube() {
  return <RubiksCube />;
}
