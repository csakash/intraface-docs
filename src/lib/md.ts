/**
 * Every docs page is also served as Markdown for agents. One rule for every page, API pages included: the Markdown
 * URL is the page URL without its trailing slash, plus `.md` (`/docs/reference/cli/` → `/docs/reference/cli.md`,
 * `/docs/` → `/docs/index.md`).
 */
export function mdUrl(pathname: string): string {
  const clean = pathname.replace(/index\.html$/, '').replace(/\/+$/, '');
  return /\/docs$/.test(clean) || clean === '' ? `${clean}/index.md` : `${clean}.md`;
}

/** Components that only exist on the HTML page (interactive demos). Their prose sits next to them in the MDX. */
const ONLY_HTML = /^\s*<([A-Z][A-Za-z]*)\b[^>]*\/>\s*$/;
const IMPORT = /^\s*import\s.+from\s+['"][^'"]+['"];?\s*$/;
const MDX_COMMENT = /^\s*\{\/\*[\s\S]*?\*\/\}\s*$/;
const TAB_ITEM = /^\s*<TabItem\b[^>]*\blabel=(?:"([^"]+)"|'([^']+)')[^>]*>\s*$/;
/** Block components whose content is plain Markdown: drop the wrapper lines, keep what's inside. */
const WRAPPER = /^\s*<\/?(?:Tabs|Steps|Aside|CardGrid)\b[^>]*>\s*$|^\s*<\/TabItem>\s*$/;

/**
 * Turns a page's MDX source into plain Markdown: no imports, no HTML-only components, tabs as `###` sections.
 * A component listed in `expand` (e.g. the generated CLI reference) is replaced by its Markdown instead of dropped.
 */
export function mdxToMarkdown(
  page: { title: string; description?: string; body: string },
  expand: Record<string, () => string> = {},
): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of page.body.replace(/\r\n/g, '\n').split('\n')) {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      out.push(line);
      if (f && f[1]?.[0] === fence[0] && (f[1]?.length ?? 0) >= fence.length) fence = null;
      continue;
    }
    if (f?.[1]) {
      fence = f[1];
      out.push(line);
      continue;
    }
    const component = ONLY_HTML.exec(line)?.[1];
    if (component && expand[component]) {
      out.push(expand[component]());
      continue;
    }
    if (IMPORT.test(line) || MDX_COMMENT.test(line) || component || WRAPPER.test(line)) continue;
    const tab = TAB_ITEM.exec(line);
    if (tab) {
      out.push(`### ${tab[1] ?? tab[2]}`, '');
      continue;
    }
    out.push(line);
  }
  const body = out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const head = [`# ${page.title}`, ''];
  if (page.description) head.push(`> ${page.description}`, '');
  return `${head.join('\n')}\n${body}\n`;
}
