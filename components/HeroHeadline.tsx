import type { CSSProperties } from "react";

type LetterStyle = CSSProperties & { "--i"?: number };

function SplitWord({ text, wordClass, letterClass }: { text: string; wordClass: string; letterClass: string }) {
  return (
    <span className={wordClass} aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span key={i} className={letterClass} style={{ "--i": i } as LetterStyle}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * The hero's two-line headline. Each word gets its own hover animation:
 * "Twist it." flips each letter end over end, "Solve it." snaps each
 * letter through a quick twist. Letters are aria-hidden and split purely
 * for the per-letter CSS animation delay (see .hero-twist/.hero-solve in
 * globals.css) — a plain-text sr-only copy underneath is what screen
 * readers and copy/paste see.
 */
export default function HeroHeadline() {
  return (
    <h1 className="hero-heading">
      <SplitWord text="Twist it." wordClass="hero-twist" letterClass="hero-twist-letter" />
      <br />
      <span className="accent-text">
        <SplitWord text="Solve it." wordClass="hero-solve" letterClass="hero-solve-letter" />
      </span>
      <span className="sr-only">Twist it. Solve it.</span>
    </h1>
  );
}
