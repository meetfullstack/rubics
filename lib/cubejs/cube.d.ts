// Types for the vendored cube.js (MIT, see ./LICENSE). solve.js extends this
// class with initSolver() and solve() when imported for its side effects.
declare class Cube {
  static fromString(facelets: string): Cube;
  static random(): Cube;
  static initSolver(): void;
  asString(): string;
  isSolved(): boolean;
  move(algorithm: string): this;
  solve(maxDepth?: number): string;
}

export = Cube;
