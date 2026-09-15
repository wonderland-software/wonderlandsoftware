# Wonderland Software

Marketing site for [Wonderland Software](https://wonderland.software), a custom software studio in Austin, Texas. Single-page Create React App, deployed to GitHub Pages.

## Scripts

Install with `npm install`, then:

### `npm start`

Dev server at [http://localhost:3000](http://localhost:3000).

### `npm test`

Jest via Create React App. For a single run: `CI=true npm test`.

### `npm run build`

Production bundle, then prerender (`scripts/prerender.mjs`). **Requires a local Chrome or Chromium binary** — the prerender step launches it to snapshot `#root` into `build/index.html`.

### `npm run deploy`

Runs `npm run build`, then publishes `build/` to the `gh-pages` branch.
