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
      reply({ type: "solution", moves: Cube.fromString(msg.facelets).solve() });
    }
  } catch (err) {
    reply({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
