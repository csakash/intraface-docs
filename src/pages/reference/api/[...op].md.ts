import type { APIRoute, GetStaticPaths } from 'astro';
import openapi from '../../../generated/openapi.json';
import { apiPages, type OpenApiDoc, operationMarkdown } from '../../../lib/api-md';

// Each HTTP API operation as Markdown, next to the page starlight-openapi builds for it.
export const getStaticPaths = (() =>
  apiPages(openapi as unknown as OpenApiDoc).map((page) => ({
    params: { op: page.slug },
    props: { md: operationMarkdown(page) },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.md as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
