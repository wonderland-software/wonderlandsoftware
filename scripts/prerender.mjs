/**
 * Prerender each real route into its own static HTML file.
 *
 * GitHub Pages serves build/about/index.html at /about/ with a 200. There is
 * no hash router and no 404.html rewrite. Crawlers that do not run JS still
 * see the page text, title, description, canonical, and social tags.
 *
 * Usage: node scripts/prerender.mjs   (runs automatically via `npm run build`)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PAGES, applyPageHead, pageForPath } from "../src/meta.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "build");
const INDEX = path.join(BUILD, "index.html");
const POST_PATH = "/__prerender__";
const TIMEOUT_MS = 60_000;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

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

const PROOF = {
  home: [
    "Currently building Vibrate",
    "Vibrate logo",
    "Austin, Texas",
    "About the Vibrate app",
    "Trusted by",
    "Strategy Conversations",
    "Design &amp; Development",
    "Integration &amp; Deployment",
    "custom software studio",
    "Meta",
    "Servy",
    "The Gear Room",
    "MFJ",
  ],
  about: ["Tag Locklar", "founder of Wonderland Software"],
  vibrate: [
    "Share your current vibe with a place pin, ratings, and friends.",
    "It is on TestFlight.",
    "https://vibrate.world",
  ],
  contact: ["Austin, TX", "mailto:tag@wonderland.software", "email tag@wonderland.software"],
};

const SHARED_PROOF = [
  "https://vibrate.world/privacy",
  "https://vibrate.world/terms",
  "https://x.com/getvibrate",
  "https://www.instagram.com/getvibrate/",
  'rel="noopener noreferrer"',
  'aria-label="Vibrate on X"',
  'aria-label="Vibrate on Instagram"',
  'aria-label="Privacy policy"',
  'aria-label="Terms of service"',
];

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location.pathname,
        html: done ? root.innerHTML : ""
      })
    });
  }, 25);
})();
</script>`;

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome/Chromium found. Set CHROME_PATH to a Chrome binary and re-run."
    );
  }
  return found;
}

function isPageRequest(urlPath) {
  return Boolean(pageForPath(urlPath));
}

function startServer(shellHtml, onMarkup) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);

    if (req.method === "POST" && urlPath === POST_PATH) {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        res.writeHead(204).end();
        try {
          onMarkup(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (err) {
          onMarkup({ path: "", html: "", error: err.message });
        }
      });
      return;
    }

    if (isPageRequest(urlPath)) {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(shellHtml);
      return;
    }

    const filePath = path.normalize(path.join(BUILD, urlPath));
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
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function launchChrome(chrome, url) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wls-prerender-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
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
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      try {
        fs.rmSync(userDataDir, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 150,
        });
      } catch {
        /* profile cleanup is best-effort */
      }
    },
  };
}

function assertProof(page, html) {
  const required = [...(PROOF[page.id] || []), ...SHARED_PROOF, `<title>${page.title}</title>`];
  const missing = required.filter((s) => !html.includes(s));
  if (missing.length) {
    throw new Error(
      `${page.path} is missing expected content: ${missing.join(" | ")}`
    );
  }
}

async function prerenderOne(chromePath, port, page, original) {
  let resolveMarkup;
  let rejectMarkup;
  const markupPromise = new Promise((resolve, reject) => {
    resolveMarkup = resolve;
    rejectMarkup = reject;
  });
  pending = (payload) => {
    if (!payload || payload.error) {
      rejectMarkup(new Error(payload?.error || "Empty prerender payload"));
      return;
    }
    resolveMarkup(payload);
  };

  const chrome = launchChrome(chromePath, `http://127.0.0.1:${port}${page.href}`);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `Timed out after ${TIMEOUT_MS}ms waiting for ${page.href} to render.\n` +
              chrome.getStderr().slice(-2000)
          )
        ),
      TIMEOUT_MS
    );
  });

  try {
    const payload = await Promise.race([markupPromise, timeout]);
    const markup = payload.html || "";
    if (!markup.trim()) {
      throw new Error(`${page.href} rendered nothing. It likely threw on boot.`);
    }
    if (pageForPath(payload.path)?.id !== page.id) {
      throw new Error(
        `${page.href} posted markup for ${payload.path || "(no path)"} instead.`
      );
    }

    const out = applyPageHead(original, page).replace(
      /<div id="root">\s*<\/div>/,
      `<div id="root">${markup}</div>`
    );
    if (!out.includes(markup.slice(0, 40))) {
      throw new Error(`Failed to inject markup for ${page.href}`);
    }
    assertProof(page, out);

    const dest = path.join(BUILD, page.outFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
    console.log(
      `prerender: wrote ${page.outFile} (${markup.length.toLocaleString()} bytes in #root)`
    );
  } finally {
    clearTimeout(timer);
    chrome.cleanup();
    pending = () => {};
  }
}

let pending = () => {};

async function main() {
  if (!fs.existsSync(INDEX)) {
    throw new Error(`No build found at ${INDEX}. Run react-scripts build first.`);
  }

  const original = fs.readFileSync(INDEX, "utf8");
  if (!/<div id="root">\s*<\/div>/.test(original)) {
    throw new Error(
      'build/index.html has no empty <div id="root"></div> to fill. ' +
        "Re-run `npm run build` from a clean react-scripts build."
    );
  }

  const chromePath = findChrome();
  const shell = original.replace("</head>", `${INJECTED}\n</head>`);
  const server = await startServer(shell, (payload) => pending(payload));
  const { port } = server.address();

  try {
    for (const page of PAGES) {
      await prerenderOne(chromePath, port, page, original);
    }
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(`\nprerender failed: ${err.message}\n`);
  process.exit(1);
});
