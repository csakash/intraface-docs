// protects=every HTTP API operation has a Markdown file at the same path as its starlight-openapi page, listed in
// llms-api.txt; fails_when=a slug drifts from the plugin's, an operation is missing, or a .md loses its method, path,
// auth or statuses; no_claim=that the OpenAPI document itself is right (human-agent-collab tests that)
import { slug } from 'github-slugger';
import { describe, expect, it } from 'vitest';
import openapi from '../src/generated/openapi.json';
import { apiOverviewMarkdown, apiPages, llmsApiTxt, type OpenApiDoc, operationMarkdown } from '../src/lib/api-md';

const doc = openapi as unknown as OpenApiDoc;
const opCount = Object.values(doc.paths).reduce((n, item) => n + Object.keys(item).length, 0);

describe('apiPages', () => {
  it('has one page per operation, slugged like starlight-openapi', () => {
    const pages = apiPages(doc);
    expect(pages).toHaveLength(opCount);
    expect(pages.find((p) => p.operation.operationId === 'publishes.create')?.slug).toBe('operations/publishescreate');
    for (const p of pages) expect(p.slug).toBe(`operations/${slug(p.operation.operationId)}`);
  });
  it('adds the method to operationIds used twice, as the plugin does', () => {
    const dup: OpenApiDoc = {
      info: { title: 't' },
      paths: { '/a': { get: { operationId: 'x', responses: {} }, post: { operationId: 'x', responses: {} } } },
    };
    expect(apiPages(dup).map((p) => p.slug)).toEqual(['operations/x/get', 'operations/x/post']);
  });
});

describe('operationMarkdown', () => {
  const md = operationMarkdown(apiPages(doc).find((p) => p.operation.operationId === 'publishes.create') as never);
  it('has the method, URL, auth, body and every status', () => {
    expect(md).toMatch(/^# publishes\.create\n\n> POST https:\/\/app\.intraface\.cc\/api\/v1\/boards\/\{id\}\/publishes/);
    expect(md).toContain('agent token (`Authorization: Bearer ifc_…`) or signed-in session');
    expect(md).toContain('## Request body (application/json)');
    for (const s of ['201', '200', '202', '409', 'default']) expect(md).toContain(`### ${s}`);
    expect(md).toContain('```json');
  });
});

describe('auth line', () => {
  it('says when an operation also works without credentials', () => {
    const report = apiPages(doc).find((p) => p.operation.operationId === 'reports.create');
    expect(report && operationMarkdown(report)).toContain('**Auth:** Optional: agent token');
    expect(report && operationMarkdown(report)).toContain('or none.');
  });
});

describe('llms-api.txt and the overview', () => {
  it('lists every operation once with its .md link', () => {
    const lines = llmsApiTxt(doc)
      .split('\n')
      .filter((l) => l.startsWith('- ['));
    expect(lines).toHaveLength(opCount);
    expect(lines).toContain(
      '- [publishes.create](https://intraface.cc/docs/reference/api/operations/publishescreate.md): POST /api/v1/boards/{id}/publishes',
    );
  });
  it('groups the overview by tag', () => {
    const md = apiOverviewMarkdown(doc);
    expect(md).toContain('## boards');
    expect(md).toContain('## webhooks');
    expect(md.match(/^- \[/gm)).toHaveLength(opCount);
  });
});
