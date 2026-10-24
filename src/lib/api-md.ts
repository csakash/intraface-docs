import { slug } from 'github-slugger';

/** The HTTP API reference as Markdown, from the generated OpenAPI document (src/generated/openapi.json). */

type Json = Record<string, unknown>;
interface Param {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Json;
}
interface Operation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Json[];
  parameters?: Param[];
  requestBody?: { content: Record<string, { schema: Json }> };
  responses: Record<string, { description?: string; content?: Record<string, { schema: Json }>; $ref?: string }>;
}
export interface OpenApiDoc {
  info: { title: string; description?: string };
  servers?: Array<{ url: string }>;
  paths: Record<string, Record<string, Operation>>;
}
export interface ApiPage {
  /** Path under /docs/reference/api/, as starlight-openapi builds it (e.g. `operations/publishescreate`). */
  slug: string;
  method: string;
  path: string;
  operation: Operation;
}

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const json = (v: unknown) => `\`\`\`json\n${JSON.stringify(v, null, 2)}\n\`\`\``;

/** Every operation with the same slug starlight-openapi gives its page (duplicate operationIds get `/<method>`). */
export function apiPages(doc: OpenApiDoc): ApiPage[] {
  const all: ApiPage[] = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const operation = item[method];
      if (operation) all.push({ slug: '', method, path, operation });
    }
  }
  const count = new Map<string, number>();
  for (const p of all) count.set(p.operation.operationId, (count.get(p.operation.operationId) ?? 0) + 1);
  for (const p of all) {
    const id = slug(p.operation.operationId);
    p.slug = (count.get(p.operation.operationId) ?? 0) > 1 ? `operations/${id}/${slug(p.method)}` : `operations/${id}`;
  }
  return all;
}

const authLine = (security: Json[] | undefined) => {
  if (!security?.length) return 'None.';
  return security
    .map((s) => Object.keys(s)[0])
    .map((k) => (k === 'bearer' ? 'agent token (`Authorization: Bearer ifc_…`)' : 'signed-in session (`__session` cookie)'))
    .join(' or ');
};

export function operationMarkdown(page: ApiPage, server = 'https://app.intraface.cc'): string {
  const op = page.operation;
  const lines = [`# ${op.operationId}`, '', `> ${page.method.toUpperCase()} ${server}${page.path}`, ''];
  if (op.description) lines.push(op.description, '');
  lines.push(`**Auth:** ${authLine(op.security)}`, '');
  for (const where of ['path', 'query'] as const) {
    const params = (op.parameters ?? []).filter((p) => p.in === where);
    if (!params.length) continue;
    lines.push(`## ${where === 'path' ? 'Path parameters' : 'Query parameters'}`, '');
    for (const p of params) {
      const type = typeof p.schema?.type === 'string' ? p.schema.type : 'value';
      lines.push(`- \`${p.name}\` (${type}${p.required ? ', required' : ''})${p.description ? `: ${p.description}` : ''}`);
    }
    lines.push('');
  }
  if (op.requestBody) {
    for (const [type, media] of Object.entries(op.requestBody.content)) {
      lines.push(`## Request body (${type})`, '', json(media.schema), '');
    }
  }
  lines.push('## Responses', '');
  for (const [status, res] of Object.entries(op.responses)) {
    if (res.$ref) {
      lines.push(`### ${status}`, '', 'Any other error, in the shared envelope `{ error: { code, message, hint?, details? } }`.', '');
      continue;
    }
    lines.push(`### ${status}${res.description ? `: ${res.description}` : ''}`, '');
    for (const [type, media] of Object.entries(res.content ?? {})) lines.push(`${type}:`, '', json(media.schema), '');
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function apiOverviewMarkdown(doc: OpenApiDoc, base = '/docs/reference/api'): string {
  const byTag = new Map<string, ApiPage[]>();
  for (const p of apiPages(doc)) {
    const tag = p.operation.tags?.[0] ?? 'other';
    byTag.set(tag, [...(byTag.get(tag) ?? []), p]);
  }
  const lines = [`# ${doc.info.title}`, ''];
  if (doc.info.description) lines.push(`> ${doc.info.description}`, '');
  lines.push(`Base URL: ${doc.servers?.[0]?.url ?? 'https://app.intraface.cc'}`, '');
  for (const [tag, pages] of byTag) {
    lines.push(`## ${tag}`, '');
    for (const p of pages) {
      lines.push(`- [${p.operation.operationId}](${base}/${p.slug}.md): \`${p.method.toUpperCase()} ${p.path}\``);
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

/** /docs/llms-api.txt: one line per operation, linking its Markdown. */
export function llmsApiTxt(doc: OpenApiDoc, origin = 'https://intraface.cc', base = '/docs/reference/api'): string {
  const lines = [
    '# Intraface HTTP API',
    '',
    `> ${apiPages(doc).length} operations, generated from the route contract. Each link is that operation as Markdown.`,
    '',
  ];
  for (const p of apiPages(doc)) {
    lines.push(`- [${p.operation.operationId}](${origin}${base}/${p.slug}.md): ${p.method.toUpperCase()} ${p.path}`);
  }
  return `${lines.join('\n')}\n`;
}
