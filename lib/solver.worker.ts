// Runs Kociemba's two-phase solver off the main thread: building its lookup
// tables takes a few seconds and would otherwise freeze the page.
import Cube from "./cubejs/cube";
import "./cubejs/solve";

export type SolverRequest =
  | { type: "init" }
  | { type: "solve"; facelets: string }
  | { type: "random" };

export type SolverResponse =
  | { type: "ready" }
  | { type: "solution"; moves: string }
  | { type: "random"; facelets: string }
  | { type: "error"; message: string };

let initialized = false;

function reply(msg: SolverResponse) {
  self.postMessage(msg);
}

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  try {
    const msg = e.data;
    if (msg.type === "random") {
      reply({ type: "random", facelets: Cube.random().asString() });
      return;
    }
    if (!initialized) {
      Cube.initSolver();
      initialized = true;
      reply({ type: "ready" });
    }
    if (msg.type === "solve") {
      const cube = Cube.fromString(msg.facelets);
      // cube.js's solve() doesn't special-case an already-solved cube: it
      // returns a non-empty sequence of moves that net to a no-op (verified
      // against the vendored solver directly) instead of "". Check first so
      // "no moves needed" is reported accurately instead of walking the
      // user through a pointless multi-step "solution".
      reply({ type: "solution", moves: cube.isSolved() ? "" : cube.solve() });
    }
  } catch (err) {
    reply({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
