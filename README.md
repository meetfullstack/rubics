# Rubics

A Rubik's cube site with two modes:

- **Solve** — enter the colors of your physical cube on an unfolded map and follow a short (~20 move) solution step by step, with a 3D cube showing every turn.
- **Play** — a 3D cube you can play in the browser. Drag a sticker to turn its row; right-drag (or drag the background) to spin the view.

Built with Next.js, TypeScript, Tailwind CSS and three.js, in the same purple liquid-glass design as [my portfolio](https://github.com/meetfullstack/portfolio).

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## How the solver works

Your sticker colors are checked first (9 of each color, every corner and edge a real piece, no twisted or swapped pieces) so mistakes get a clear message. Valid cubes are solved with Herbert Kociemba's two-phase algorithm, running in a Web Worker so the page never freezes. The 3D guide starts from your exact cube state by applying the solution in reverse to a solved cube.

## Credits

The solver in [`lib/cubejs`](lib/cubejs) is [cube.js](https://github.com/ldez/cubejs) by Petri Lehtinen, used under the MIT license (see [`lib/cubejs/LICENSE`](lib/cubejs/LICENSE)). It's vendored rather than installed because the npm package pulls in an outdated `npm` dependency.
