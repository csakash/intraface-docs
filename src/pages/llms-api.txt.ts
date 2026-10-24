import type { APIRoute } from 'astro';
import openapi from '../generated/openapi.json';
import { llmsApiTxt, type OpenApiDoc } from '../lib/api-md';

export const GET: APIRoute = () =>
  new Response(llmsApiTxt(openapi as unknown as OpenApiDoc), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
