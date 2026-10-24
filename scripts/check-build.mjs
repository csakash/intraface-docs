#!/usr/bin/env node
// Post-build checks on dist/docs (SPEC docs, acceptance criteria 2–5, 7, 14). Fails the build and prints every
// problem it found.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const OUT = 'dist/docs';
const SITE = 'https://intraface.cc';
const problems = [];

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(OUT);
const pages = files.filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));

/** dist/docs/reference/cli/index.html → /docs/reference/cli/ */
const urlOf = (f) => `/docs/${relative(OUT, f).replace(/index\.html$/, '')}`;
const mdOf = (url) => (url === '/docs/' ? '/docs/index.md' : `${url.replace(/\/$/, '')}.md`);
const attr = (html, re) => re.exec(html)?.[1];

const descriptions = new Map();
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  const url = urlOf(f);
  const bad = (msg) => problems.push(`${url}: ${msg}`);
  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) bad(`${h1s} <h1> elements, want 1`);
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
  if (canonical !== `${SITE}${url}`) bad(`canonical is ${canonical}, want ${SITE}${url}`);
  for (const p of ['og:title', 'og:description', 'og:image']) {
    if (!new RegExp(`<meta property="${p}" content="[^"]+"`).test(html)) bad(`missing ${p}`);
  }
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  if (!desc) bad('missing meta description');
  else if (desc.length > 160) bad(`meta description is ${desc.length} characters`);
  else descriptions.set(desc, [...(descriptions.get(desc) ?? []), url]);
  const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  try {
    const types = JSON.parse(ld ?? 'null')['@graph'].map((g) => g['@type']);
    if (!types.includes('TechArticle') || !types.includes('BreadcrumbList')) bad(`JSON-LD has ${types.join(', ')}`);
  } catch {
    bad('missing or invalid JSON-LD');
  }
  const alt = attr(html, /<link rel="alternate" type="text\/markdown" href="([^"]+)"/);
  if (alt !== mdOf(url)) bad(`markdown alternate is ${alt}, want ${mdOf(url)}`);
  if (!existsSync(join('dist', mdOf(url)))) bad(`no ${mdOf(url)}`);
  if (/<select[\s>]/.test(html)) bad('has a native <select>');
  if (/<script[^>]+src="https:\/\/www\.googletagmanager/.test(html)) bad('loads gtag.js before the page has loaded');
}
for (const [desc, urls] of descriptions) {
  if (urls.length > 1) problems.push(`same meta description on ${urls.join(', ')}: "${desc.slice(0, 60)}…"`);
}

// The sitemap lists every page.
const sitemap = files
  .filter((f) => /sitemap-\d+\.xml$/.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('');
const locs = sitemap.match(/<loc>/g)?.length ?? 0;
if (locs !== pages.length) problems.push(`sitemap lists ${locs} URLs, built ${pages.length} pages`);

// Files for agents.
for (const f of ['llms.txt', 'llms-full.txt', 'llms-small.txt', 'llms-api.txt']) {
  if (!existsSync(join(OUT, f))) problems.push(`missing /docs/${f}`);
}
const openapi = JSON.parse(readFileSync('src/generated/openapi.json', 'utf8'));
const ops = Object.values(openapi.paths).reduce((n, item) => n + Object.keys(item).length, 0);
const apiLines = readFileSync(join(OUT, 'llms-api.txt'), 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('- ['));
if (apiLines.length !== ops) problems.push(`llms-api.txt lists ${apiLines.length} operations, the API has ${ops}`);
const index = readFileSync(join(OUT, 'index.md'), 'utf8');
if (/^\s*import\s/m.test(index) || /<(Sim|RaceDemo|AgentPicker|Tabs|TabItem|Steps)\b/.test(index)) {
  problems.push('/docs/index.md still has MDX imports or component tags');
}

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `check-build: ✓ ${pages.length} pages, ${pages.length} .md files, ${locs} sitemap URLs, ${ops} API operations`,
);
