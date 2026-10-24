/**
 * Breadcrumbs for a docs URL: only levels that exist as pages get a link, so the visible trail and the JSON-LD
 * BreadcrumbList agree and never point at a 404.
 */
export interface Crumb {
  label: string;
  /** Path of the page for this level; absent when the level has no page of its own (e.g. "Reference"). */
  href?: string;
}

export function crumbsFor(pathname: string, title: string, base = '/docs'): Crumb[] {
  const rest = pathname.slice(base.length).split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Docs', href: `${base}/` }];
  if (rest[0] === 'reference') crumbs.push({ label: 'Reference' });
  if (rest[0] === 'reference' && rest[1] === 'api' && rest.length > 2) {
    crumbs.push({ label: 'HTTP API', href: `${base}/reference/api/` });
  }
  if (rest.length) crumbs.push({ label: title, href: pathname });
  return crumbs;
}
