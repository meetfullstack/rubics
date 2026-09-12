"use client";

import dynamic from "next/dynamic";

// Splits the three.js engine into its own chunk so the hero text and
// buttons render immediately — the cube pops in once that chunk arrives.
const RubiksCube = dynamic(() => import("./RubiksCube"), {
  ssr: false,
  loading: () => (
    <div className="cube-skeleton" role="status">
      <span className="sr-only">Loading 3D cube…</span>
    </div>
  ),
});

export default function HeroCube() {
  return <RubiksCube mode="hero" />;
}
