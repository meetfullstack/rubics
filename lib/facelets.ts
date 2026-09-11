// A cube's stickers as a 54-entry array in Kociemba order (U R F D L B faces,
// 9 stickers each, read left-to-right / top-to-bottom on the unfolded net).
// Colors are named after the face they belong to when solved, with the cube
// held white-up, green-front.

export type Color = "U" | "R" | "F" | "D" | "L" | "B";
export type Facelets = (Color | null)[];

export const COLORS: Color[] = ["U", "R", "F", "D", "L", "B"];

export const COLOR_HEX: Record<Color, string> = {
  U: "#ffffff",
  R: "#b71234",
  F: "#009b48",
  D: "#ffd500",
  L: "#ff5800",
  B: "#0046ad",
};

export const COLOR_NAME: Record<Color, string> = {
  U: "White",
  R: "Red",
  F: "Green",
  D: "Yellow",
  L: "Orange",
  B: "Blue",
};

export const FACE_LABEL: Record<Color, string> = {
  U: "Top",
  R: "Right",
  F: "Front",
  D: "Bottom",
  L: "Left",
  B: "Back",
};

export const isCenter = (i: number) => i % 9 === 4;

export function emptyFacelets(): Facelets {
  return Array.from({ length: 54 }, (_, i) => (isCenter(i) ? COLORS[Math.floor(i / 9)] : null));
}

// Sticker positions of each corner/edge slot — same tables cube.js uses.
const U = (x: number) => x - 1;
const R = (x: number) => 8 + x;
const F = (x: number) => 17 + x;
const D = (x: number) => 26 + x;
const L = (x: number) => 35 + x;
const B = (x: number) => 44 + x;

const CORNER_SLOTS = [
  [U(9), R(1), F(3)], [U(7), F(1), L(3)], [U(1), L(1), B(3)], [U(3), B(1), R(3)],
  [D(3), F(9), R(7)], [D(1), L(9), F(7)], [D(7), B(9), L(7)], [D(9), R(9), B(7)],
];
const CORNER_PIECES: Color[][] = [
  ["U", "R", "F"], ["U", "F", "L"], ["U", "L", "B"], ["U", "B", "R"],
  ["D", "F", "R"], ["D", "L", "F"], ["D", "B", "L"], ["D", "R", "B"],
];
const EDGE_SLOTS = [
  [U(6), R(2)], [U(8), F(2)], [U(4), L(2)], [U(2), B(2)],
  [D(6), R(8)], [D(2), F(8)], [D(4), L(8)], [D(8), B(8)],
  [F(6), R(4)], [F(4), L(6)], [B(6), L(4)], [B(4), R(6)],
];
const EDGE_PIECES: Color[][] = [
  ["U", "R"], ["U", "F"], ["U", "L"], ["U", "B"], ["D", "R"], ["D", "F"],
  ["D", "L"], ["D", "B"], ["F", "R"], ["F", "L"], ["B", "L"], ["B", "R"],
];

const names = (cs: Color[]) => cs.map((c) => COLOR_NAME[c].toLowerCase()).join("-");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function parity(p: number[]) {
  let inversions = 0;
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) inversions++;
  return inversions % 2;
}

/**
 * Checks the stickers describe a cube that can actually be solved. Returns a
 * human-readable problem, or null if valid. The solver itself gives garbage
 * (or never finishes) on impossible input, so this must run first.
 */
export function validateFacelets(f: Facelets): string | null {
  const blank = f.filter((c) => c === null).length;
  if (blank) return `${blank} sticker${blank === 1 ? " is" : "s are"} still blank.`;
  const cs = f as Color[];

  for (const c of COLORS) {
    const n = cs.filter((x) => x === c).length;
    if (n !== 9)
      return `You have ${n} ${COLOR_NAME[c].toLowerCase()} stickers. Every color needs exactly 9.`;
  }

  const cp: number[] = [];
  const co: number[] = [];
  for (const slot of CORNER_SLOTS) {
    const cols = slot.map((i) => cs[i]);
    const ori = cols.findIndex((c) => c === "U" || c === "D");
    if (ori < 0)
      return `There's a ${names(cols)} corner, but every corner has a white or yellow sticker.`;
    const piece = CORNER_PIECES.findIndex(
      (p) => p[0] === cols[ori] && p[1] === cols[(ori + 1) % 3] && p[2] === cols[(ori + 2) % 3],
    );
    if (piece < 0)
      return `A ${names(cols)} corner doesn't exist on a real cube. Check those three stickers.`;
    if (cp.includes(piece)) return `The ${names(CORNER_PIECES[piece])} corner appears twice.`;
    cp.push(piece);
    co.push(ori);
  }

  const ep: number[] = [];
  const eo: number[] = [];
  for (const slot of EDGE_SLOTS) {
    const [a, b] = slot.map((i) => cs[i]);
    let flip = 0;
    let piece = EDGE_PIECES.findIndex((p) => p[0] === a && p[1] === b);
    if (piece < 0) {
      piece = EDGE_PIECES.findIndex((p) => p[0] === b && p[1] === a);
      flip = 1;
    }
    if (piece < 0)
      return `A ${names([a, b])} edge doesn't exist on a real cube. Check those two stickers.`;
    if (ep.includes(piece)) return `The ${names(EDGE_PIECES[piece])} edge appears twice.`;
    ep.push(piece);
    eo.push(flip);
  }

  if (sum(co) % 3)
    return "One corner looks twisted in place. Double-check your corner stickers: a real cube can't get into this state unless it was taken apart.";
  if (sum(eo) % 2)
    return "One edge looks flipped in place. Double-check your edge stickers: a real cube can't get into this state unless it was taken apart.";
  if (parity(cp) !== parity(ep))
    return "Two pieces look swapped. Double-check your stickers: a real cube can't get into this state unless it was taken apart.";

  return null;
}
