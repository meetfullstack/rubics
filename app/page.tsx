import Link from "next/link";
import CornerButton from "@/components/CornerButton";
import HeroCube from "@/components/HeroCube";

const features = [
  {
    href: "/solve",
    tag: "01 · Solver",
    title: "Solve your real cube",
    body: "Enter your scrambled cube's colors and follow a short solution one move at a time, with a 3D cube showing every turn.",
  },
  {
    href: "/play",
    tag: "02 · Play online",
    title: "Play in the browser",
    body: "A real-time 3D cube with animated turns, scrambling, a move counter and full keyboard control.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="section-tag">Rubik&rsquo;s cube · Solver &amp; playground</p>
            <h1 className="hero-heading">
              Twist it.
              <br />
              <span className="accent-text">Solve it.</span>
            </h1>
            <p className="hero-sub">
              Stuck on a scrambled cube? Enter its colors and Rubics walks you through the
              solution step by step. Or just play with one right here in your browser.
            </p>
            <div className="hero-cta">
              <CornerButton href="/solve" variant="primary">
                Solve my cube →
              </CornerButton>
              <CornerButton href="/play" variant="secondary">
                Play online
              </CornerButton>
            </div>
          </div>
          <div className="hero-cube">
            <HeroCube />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container feature-grid">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card"
              style={{ padding: "2rem", textDecoration: "none", color: "inherit" }}
            >
              <p className="section-tag">{f.tag}</p>
              <h2 className="feature-title">{f.title}</h2>
              <p className="feature-body">{f.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
