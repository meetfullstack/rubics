import type { Metadata } from "next";
import PlayCube from "@/components/PlayCube";

export const metadata: Metadata = {
  title: "Play",
  description: "Play with a Rubik's cube online: turn faces, scramble it and try to solve it.",
};

export default function PlayPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="section-header">
          <span className="section-number" aria-hidden="true">
            02
          </span>
          <p className="section-tag">Play online</p>
          <h1 className="section-title">
            Play the <span className="accent-text">cube</span>
          </h1>
          <p className="section-lead">
            Scramble it, then grab any sticker and drag to twist it back. Stuck? Hit Solve and
            watch it rewind.
          </p>
        </header>
        <PlayCube />
      </div>
    </section>
  );
}
