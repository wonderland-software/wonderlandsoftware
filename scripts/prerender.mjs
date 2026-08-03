/**
 * Prerender the built site into static HTML.
 *
 * Why: this is a Create React App SPA on GitHub Pages, so the shipped
 * index.html is an empty <div id="root">. Googlebot will eventually render
 * the JS, but Bing and the AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * will not. Without this step the site is a blank page to all of them.
 *
 * How: serve build/ locally, load it in the Chrome already installed on this
 * machine with window.__PRERENDER__ set, and have the page POST its rendered
 * #root markup back to that server. Node writes the markup into
 * build/index.html; src/index.js sees it and hydrates instead of
 * client-rendering.
 *
 * The page pushes its own markup rather than us using Chrome's --dump-dom
 * because this app runs permanent requestAnimationFrame loops (the rabbit
 * sprite and the animated favicon). Those never go idle, so --dump-dom with
 * --virtual-time-budget spins forever instead of exiting.
 *
 * No puppeteer dependency, so no second Chromium download.
 *
 * Usage: node scripts/prerender.mjs   (runs automatically via `npm run build`)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "build");
const INDEX = path.join(BUILD, "index.html");
const POST_PATH = "/__prerender__";
const TIMEOUT_MS = 60_000;

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

// Runs before the app bundle, so the flag is set by the time React renders.
// Then polls until React has committed and posts the markup back. Polling
// rather than listening for `load` because React 18's root render is
// scheduled, not synchronous, so it can commit after the load event.
const INJECTED = `<script>
window.__PRERENDER__ = true;
(function () {
  var tries = 0;
  var timer = setInterval(function () {
    var root = document.getElementById("root");
    var done = root && root.firstChild;
    if (!done && ++tries < 400) return;
    clearInterval(timer);
    fetch(${JSON.stringify(POST_PATH)}, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: done ? root.innerHTML : "__PRERENDER_EMPTY__"
    });
  }, 25);
})();
</script>`;

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome/Chromium found. Set CHROME_PATH to a Chrome binary and re-run."
    );
  }
  return found;
}

function startServer(indexHtml, onMarkup) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);

    if (req.method === "POST" && urlPath === POST_PATH) {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(204).end();
        onMarkup(Buffer.concat(chunks).toString("utf8"));
      });
      return;
    }

    if (urlPath === "/" || urlPath === "/index.html") {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(indexHtml);
      return;
    }

    // Resolve inside build/ only — never serve outside it.
    const filePath = path.join(BUILD, urlPath);
    if (
      !filePath.startsWith(BUILD + path.sep) ||
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).isDirectory()
    ) {
      res.writeHead(404).end("not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    // Port 0 lets the OS pick a free port, so parallel runs cannot collide.
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function launchChrome(chrome, url) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wls-prerender-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      "--window-size=1440,1200",
      url,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));

  return {
    child,
    getStderr: () => stderr,
    cleanup() {
      // Chrome is long-lived by design here; we kill it once we have markup.
      try {
        child.kill("SIGKILL");
      } catch {}
      fs.rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

async function main() {
  if (!fs.existsSync(INDEX)) {
    throw new Error(`No build found at ${INDEX}. Run react-scripts build first.`);
  }

  const original = fs.readFileSync(INDEX, "utf8");

  // Refuse to run twice over the same build rather than nesting markup.
  if (!/<div id="root">\s*<\/div>/.test(original)) {
    throw new Error(
      'build/index.html has no empty <div id="root"></div> to fill. ' +
        "It is probably already prerendered; re-run `npm run build` from clean."
    );
  }

  const chromePath = findChrome();
  const served = original.replace("</head>", `${INJECTED}\n</head>`);

  let resolveMarkup;
  const markupPromise = new Promise((r) => (resolveMarkup = r));
  const server = await startServer(served, resolveMarkup);
  const { port } = server.address();

  const chrome = launchChrome(chromePath, `http://127.0.0.1:${port}/`);

  let timer;
  const timeout = new Promise((_, reject) => {
    // Node-side timeout. Do not use GNU `timeout` here: it is absent on macOS
    // and silently prevents Chrome from running at all.
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `Timed out after ${TIMEOUT_MS}ms waiting for the page to render.\n` +
              chrome.getStderr().slice(-2000)
          )
        ),
      TIMEOUT_MS
    );
  });

  try {
    const markup = await Promise.race([markupPromise, timeout]);

    if (!markup || markup === "__PRERENDER_EMPTY__") {
      throw new Error("The app rendered nothing. It likely threw on boot.");
    }

    // Guard: a silently-broken render would ship a blank page to every
    // crawler, which is the exact failure this script exists to prevent.
    const required = [
      "Custom software,",
      "Strategy Conversations",
      "Design &amp; Development",
      "Integration &amp; Deployment",
      "Trusted by",
    ];
    const missing = required.filter((s) => !markup.includes(s));
    if (missing.length) {
      throw new Error(
        `Prerendered markup is missing expected content: ${missing.join(", ")}\n` +
          `Got ${markup.length} bytes.`
      );
    }

    const out = original.replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root">${markup}</div>`
    );
    if (out === original) throw new Error("Failed to inject markup into index.html");

    fs.writeFileSync(INDEX, out);
    console.log(
      `prerender: injected ${markup.length.toLocaleString()} bytes into build/index.html`
    );
  } finally {
    clearTimeout(timer);
    chrome.cleanup();
    server.close();
  }
}

main().catch((err) => {
  console.error(`\nprerender failed: ${err.message}\n`);
  process.exit(1);
});
