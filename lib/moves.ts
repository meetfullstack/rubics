export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type Move = { face: Face; prime: boolean; double?: boolean };

export const FACES: Face[] = ["U", "D", "L", "R", "F", "B"];

const FACE_NAMES: Record<Face, string> = {
  U: "top",
  D: "bottom",
  L: "left",
  R: "right",
  F: "front",
  B: "back",
};

/** Parses standard notation, e.g. "R U2 F'". */
export function parseMoves(alg: string): Move[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const face = token[0] as Face;
      if (!FACES.includes(face)) throw new Error(`Unknown move: ${token}`);
      return { face, prime: token[1] === "'", double: token[1] === "2" };
    });
}

export const invertMove = (m: Move): Move => ({
  face: m.face,
  prime: m.double ? false : !m.prime,
  double: m.double,
});

export const invertMoves = (moves: Move[]) => [...moves].reverse().map(invertMove);

export const moveLabel = (m: Move) => `${m.face}${m.double ? "2" : m.prime ? "′" : ""}`;

export function describeMove(m: Move) {
  const face = FACE_NAMES[m.face];
  if (m.double) return `Turn the ${face} face twice (a half turn)`;
  return `Turn the ${face} face ${m.prime ? "counter-clockwise" : "clockwise"}`;
}
