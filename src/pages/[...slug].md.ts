import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import openapi from '../generated/openapi.json';
import { apiOverviewMarkdown, type OpenApiDoc } from '../lib/api-md';
import { mdxToMarkdown } from '../lib/md';
import { cliMarkdown, mcpMarkdown } from '../lib/refs';

const EXPAND = { CliRef: cliMarkdown, McpRef: mcpMarkdown };

// Each docs page as Markdown (`/docs/<page>.md`), plus the HTTP API overview at /docs/reference/api.md.
export const getStaticPaths = (async () => {
  const docs = await getCollection('docs');
  return [
    ...docs.map((entry) => ({
      params: { slug: entry.id },
      props: {
        md: mdxToMarkdown(
          { title: entry.data.title, description: entry.data.description, body: entry.body ?? '' },
          EXPAND,
        ),
      },
    })),
    { params: { slug: 'reference/api' }, props: { md: apiOverviewMarkdown(openapi as unknown as OpenApiDoc) } },
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.md as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
