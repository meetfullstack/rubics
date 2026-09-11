import type { Metadata } from "next";
import SolveGuide from "@/components/SolveGuide";

export const metadata: Metadata = {
  title: "Solve",
  description:
    "Enter the colors of your physical Rubik's cube and get a short, step-by-step solution with a 3D guide.",
};

export default function SolvePage() {
  return (
    <section className="section">
      <div className="container">
        <header className="section-header">
          <span className="section-number" aria-hidden="true">
            01
          </span>
          <p className="section-tag">Solver · Step by step</p>
          <h1 className="section-title">
            Solve <span className="accent-text">your</span> cube
          </h1>
          <p className="section-lead">
            Copy your scrambled cube&rsquo;s colors onto the map below. You&rsquo;ll get a short
            solution (usually around 20 moves) that you can follow one turn at a time.
          </p>
        </header>
        <SolveGuide />
      </div>
    </section>
  );
}
