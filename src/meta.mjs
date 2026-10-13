/**
 * Route table shared by the React app and the prerender step.
 * Each route is a real file (build/<path>/index.html), not a hash or a
 * 404.html fallback.
 */

export const SITE = "https://wonderland.software";

export const MAILTO =
  "mailto:tag@wonderland.software?subject=Project%20Inquiry&body=Hi%20Tag%2C%0A%0AI'd%20like%20to%20talk%20about%20a%20software%20project.%0A%0A-%20Company%20%2F%20industry%3A%0A-%20What%20we're%20trying%20to%20build%3A%0A-%20Tools%20we%20use%20today%3A%0A-%20Timeline%3A%0A%0AThanks!";

const ORG_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;

export const PAGES = [
  {
    id: "home",
    path: "/",
    href: "/",
    outFile: "index.html",
    title: "Wonderland Software | Austin, Texas",
    description:
      "Wonderland Software is a custom software studio in Austin, Texas, currently building Vibrate. Strategy conversations, design and development, and integration and deployment.",
    noscript:
      "Wonderland Software, Austin, Texas. Currently building Vibrate. Custom software studio: strategy conversations, design and development, integration and deployment.",
  },
  {
    id: "about",
    path: "/about",
    href: "/about/",
    outFile: "about/index.html",
    title: "Tag Locklar, founder | Wonderland Software",
    description: "Tag Locklar is the founder of Wonderland Software.",
    noscript: "Tag Locklar is the founder of Wonderland Software.",
  },
  {
    id: "vibrate",
    path: "/vibrate",
    href: "/vibrate/",
    outFile: "vibrate/index.html",
    title: "Vibrate | Wonderland Software",
    description:
      "Share your current vibe with a place pin, ratings, and friends. Vibrate is an iOS app from Wonderland Software, on TestFlight.",
    noscript:
      "Vibrate. Share your current vibe with a place pin, ratings, and friends. iOS app on TestFlight. https://vibrate.world",
  },
  {
    id: "contact",
    path: "/contact",
    href: "/contact/",
    outFile: "contact/index.html",
    title: "Contact | Wonderland Software",
    description:
      "Email tag@wonderland.software. Wonderland Software is in Austin, TX.",
    noscript: "Contact Wonderland Software. Austin, TX. Email tag@wonderland.software.",
  },
];

export function canonicalFor(page) {
  return page.path === "/" ? `${SITE}/` : `${SITE}${page.path}/`;
}

export function normalizePath(pathname) {
  if (!pathname) return "/";
  let path = String(pathname).split("?")[0].split("#")[0];
  path = path.replace(/\/index\.html$/, "");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (!path.startsWith("/")) path = `/${path}`;
  return path || "/";
}

export function pageForPath(pathname) {
  const path = normalizePath(pathname);
  return PAGES.find((page) => page.path === path) || null;
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function replaceTag(html, pattern, replacement) {
  let matched = false;
  const next = html.replace(pattern, () => {
    matched = true;
    return replacement;
  });
  if (!matched) {
    throw new Error(`Could not update head tag: ${pattern}`);
  }
  return next;
}

function replaceMeta(html, attr, key, value) {
  const pattern = new RegExp(
    `<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*\\/?>`
  );
  return replaceTag(
    html,
    pattern,
    `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`
  );
}

function organization() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Wonderland Software",
    url: `${SITE}/`,
    email: "tag@wonderland.software",
    description:
      "Wonderland Software is a custom software studio based in Austin, Texas, building web apps, mobile apps, AI agents, and Shopify storefronts for teams here and anywhere else.",
    founder: { "@id": `${SITE}/#tag-locklar` },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Austin",
      addressRegion: "TX",
      addressCountry: "US",
    },
  };
}

function founder() {
  return {
    "@type": "Person",
    "@id": `${SITE}/#tag-locklar`,
    name: "Tag Locklar",
    jobTitle: "Founder",
    email: "tag@wonderland.software",
    worksFor: { "@id": ORG_ID },
  };
}

function website() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE}/`,
    name: "Wonderland Software",
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

function services() {
  return {
    "@type": "OfferCatalog",
    "@id": `${SITE}/#services`,
    name: "Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Strategy Conversations",
          description:
            "Before anything gets built, we have a conversation. We sit down with you to map what your business actually needs, and what it doesn't.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Design & Development",
          description:
            "Web apps, mobile apps, and custom tools built to fit your business. Thoughtfully designed, cleanly engineered, and shaped around the way your team actually works.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Integration & Deployment",
          description:
            "From proof-of-concept to production, wired into the systems and workflows you already rely on.",
        },
      },
    ],
  };
}

function vibrateApp() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#vibrate`,
    name: "Vibrate",
    url: "https://vibrate.world",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "iOS",
    description:
      "Share your current vibe with a place pin, ratings, and friends.",
    image: `${SITE}/logo-mark-176.webp`,
    publisher: { "@id": ORG_ID },
    sameAs: [
      "https://x.com/getvibrate",
      "https://www.instagram.com/getvibrate/",
    ],
  };
}

function jsonLd(page) {
  const canonical = canonicalFor(page);
  const graph = [organization(), founder(), website()];
  if (page.id === "home") graph.push(services());
  if (page.id === "vibrate") graph.push(vibrateApp());
  graph.push({
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": page.id === "vibrate" ? `${SITE}/#vibrate` : ORG_ID },
    inLanguage: "en-US",
  });
  return { "@context": "https://schema.org", "@graph": graph };
}

export function applyPageHead(html, page) {
  const canonical = canonicalFor(page);
  let out = html;
  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${escapeText(page.title)}</title>`);
  out = replaceMeta(out, "name", "description", page.description);
  out = replaceMeta(out, "property", "og:title", page.title);
  out = replaceMeta(out, "property", "og:description", page.description);
  out = replaceMeta(out, "property", "og:url", canonical);
  out = replaceMeta(out, "name", "twitter:title", page.title);
  out = replaceMeta(out, "name", "twitter:description", page.description);
  out = replaceTag(
    out,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  const json = JSON.stringify(jsonLd(page), null, 2).replace(/</g, "\\u003c");
  out = replaceTag(
    out,
    /<script id="site-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script id="site-jsonld" type="application/ld+json">\n${json}\n    </script>`
  );
  out = replaceTag(
    out,
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript>\n      ${escapeText(page.noscript)}\n    </noscript>`
  );
  return out;
}
