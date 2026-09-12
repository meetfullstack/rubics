"use client";

import dynamic from "next/dynamic";
import { useDelayedTrue } from "@/lib/useDelayedTrue";

// Splits the three.js engine into its own chunk so the hero text and
// buttons render immediately — the cube pops in once that chunk arrives.
const RubiksCube = dynamic(() => import("./RubiksCube"), {
  ssr: false,
  loading: () => <HeroSkeleton />,
});

function HeroSkeleton() {
  // Only shows the pulsing placeholder once loading has taken a moment —
  // on a fast connection this resolves before the delay, so nothing flashes.
  const show = useDelayedTrue();
  return (
    <div className={`cube-skeleton${show ? " is-loading" : ""}`} role="status">
      <span className="sr-only">Loading 3D cube…</span>
    </div>
  );
}

export default function HeroCube() {
  return <RubiksCube mode="hero" />;
}
