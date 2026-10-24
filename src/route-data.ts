import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import openapi from './generated/openapi.json';
import { apiPages, type OpenApiDoc } from './lib/api-md';
import { CLI, type CliCommand, mcpGroups } from './lib/refs';

const PAGES = apiPages(openapi as unknown as OpenApiDoc);
const OVERVIEW =
  'Every route of the Intraface HTTP API v1: auth, permissions, limits and every status it can return. Generated from the route contract.';

const clip = (s: string, n = 155) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
const plain = (s: string) => s.replace(/`/g, '');

type TocItem = { depth: number; slug: string; text: string; children: TocItem[] };
const item = (depth: number, slug: string, text: string, children: TocItem[] = []): TocItem => ({
  depth,
  slug,
  text,
  children,
});

/** The CLI and MCP pages render their headings from generated data, so Starlight can't see them: list them here. */
function referenceToc(path: string): TocItem[] | undefined {
  if (path === '/docs/reference/cli/') {
    const cmds: TocItem[] = [];
    const walk = (c: CliCommand, prefix: string) => {
      const full = `${prefix}${c.name}`;
      cmds.push(item(3, `cmd-${full.replace(/\s+/g, '-')}`, full));
      for (const s of c.subcommands) walk(s, `${full} `);
    };
    for (const c of CLI.commands) walk(c, '');
    return [item(2, 'flags', 'Flags every command takes'), item(2, 'commands', 'Commands', cmds), item(2, 'exit-codes', 'Exit codes')];
  }
  if (path === '/docs/reference/mcp/') {
    return mcpGroups().map(([group, tools]) =>
      item(
        2,
        group.toLowerCase(),
        group,
        tools.map((t) => item(3, t.name, t.name)),
      ),
    );
  }
  return undefined;
}

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const path = context.url.pathname;

  const extra = referenceToc(path);
  if (extra && route.toc) route.toc.items = [...route.toc.items, ...extra];

  // starlight-openapi pages carry no description: give each its own (meta description, og:description, JSON-LD).
  if (route.entry.data.description || !path.startsWith('/docs/reference/api')) return;
  const rest = path.replace(/^\/docs\/reference\/api\/?/, '').replace(/\/$/, '');
  const page = PAGES.find((p) => p.slug === rest);
  const description = page
    ? clip(plain(`${page.method.toUpperCase()} ${page.path}. ${page.operation.description ?? page.operation.operationId}`))
    : OVERVIEW;
  route.entry.data.description = description;
  for (const tag of route.head) {
    const a = tag.attrs ?? {};
    if (tag.tag === 'meta' && (a.name === 'description' || a.property === 'og:description' || a.name === 'twitter:description')) {
      a.content = description;
    }
  }
  if (!route.head.some((t) => t.tag === 'meta' && t.attrs?.name === 'description')) {
    route.head.push({ tag: 'meta', attrs: { name: 'description', content: description } });
  }
});
