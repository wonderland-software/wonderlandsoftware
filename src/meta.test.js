import { applyPageHead, normalizePath, pageForPath, PAGES } from './meta.mjs';

const FIXTURE = `<!DOCTYPE html>
<html><head>
<title>Old</title>
<meta name="description" content="Old description" />
<link rel="canonical" href="https://example.com/old" />
<meta property="og:url" content="https://example.com/old" />
<meta property="og:title" content="Old" />
<meta property="og:description" content="Old description" />
<meta name="twitter:title" content="Old" />
<meta name="twitter:description" content="Old description" />
<script id="site-jsonld" type="application/ld+json">
{"@context":"https://schema.org"}
</script>
</head><body>
<noscript>Old</noscript>
<div id="root"></div>
</body></html>`;

test('normalizes directory indexes and trailing slashes', () => {
  expect(normalizePath('/about/')).toBe('/about');
  expect(normalizePath('/about/index.html')).toBe('/about');
  expect(normalizePath('/')).toBe('/');
  expect(normalizePath('/contact')).toBe('/contact');
  expect(pageForPath('/vibrate/').id).toBe('vibrate');
  expect(pageForPath('/missing')).toBeNull();
});

test('each page gets its own title, description, canonical, and social tags', () => {
  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();

  for (const page of PAGES) {
    const html = applyPageHead(FIXTURE, page);
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(html).toContain(`content="${page.description}"`);
    const canonical = page.path === '/'
      ? 'https://wonderland.software/'
      : `https://wonderland.software${page.path}/`;
    expect(html).toContain(`<link rel="canonical" href="${canonical}" />`);
    expect(html).toContain(`property="og:url" content="${canonical}"`);
    expect(html).toContain(`property="og:title" content="${page.title}"`);
    expect(html).toContain(`name="twitter:title" content="${page.title}"`);
    expect(html).not.toContain('content="Old');
    titles.add(page.title);
    descriptions.add(page.description);
    canonicals.add(canonical);
  }

  expect(titles.size).toBe(PAGES.length);
  expect(descriptions.size).toBe(PAGES.length);
  expect(canonicals.size).toBe(PAGES.length);
});
