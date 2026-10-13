# Wonderland Software

Marketing site for [Wonderland Software](https://wonderland.software), a custom software studio in Austin, Texas, currently building [Vibrate](https://vibrate.world). Create React App, deployed to GitHub Pages as real HTML files.

Pages: `/`, `/about/`, `/vibrate/`, `/contact/`. Each one is prerendered to its own `index.html` (`build/about/index.html` and so on). There is no hash router and no 404 rewrite.

## Scripts

Install with `npm install`, then:

### `npm start`

Dev server at [http://localhost:3000](http://localhost:3000).

### `npm test`

Jest via Create React App. For a single run: `CI=true npm test`.

### `npm run build`

Production bundle, then prerender (`scripts/prerender.mjs`). **Requires a local Chrome or Chromium binary.** The prerender step snapshots each route into its own file under `build/`.

### `npm run deploy`

Runs `npm run build`, then publishes `build/` to the `gh-pages` branch.
