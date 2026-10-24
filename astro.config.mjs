// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap';

// Served at https://intraface.cc/docs through the landing Worker. outDir nests the build under docs/ so file paths
// equal URL paths for the assets-only Worker (dist/docs/reference/cli/index.html ↔ /docs/reference/cli/).
export default defineConfig({
  site: 'https://intraface.cc',
  base: '/docs',
  trailingSlash: 'always',
  outDir: './dist/docs',
  // CSS goes into each page: four render-blocking stylesheet requests cost ~2 s of first paint on mobile networks.
  build: { inlineStylesheets: 'always' },
  integrations: [
    starlight({
      title: 'Intraface Docs',
      description:
        'Connect Claude Code, Codex, Copilot or Cursor to a shared Intraface board: the CLI, the MCP server and the HTTP API.',
      favicon: '/favicon.svg',
      lastUpdated: false,
      routeMiddleware: './src/route-data.ts',
      editLink: { baseUrl: 'https://github.com/csakash/intraface-docs/edit/main/' },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/csakash/intraface-docs' }],
      customCss: ['./src/styles/theme.css'],
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
        // Fonts load without blocking the first paint (the system font shows until they arrive).
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'style',
            href: FONTS,
            onload: "this.onload=null;this.rel='stylesheet'",
          },
        },
        { tag: 'noscript', content: `<link rel="stylesheet" href="${FONTS}">` },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://intraface.cc/docs/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://intraface.cc/docs/og.png' } },
      ],
      expressiveCode: {
        themes: ['github-dark-default'],
        useStarlightUiThemeColors: false,
        // Keep the external code-block stylesheet (cached for a year via dist/_headers): the inline mode writes the
        // CSS into a literal set:html attribute here, so it never applies.
        styleOverrides: {
          codeBackground: '#121211',
          borderColor: '#2A2A27',
          borderRadius: '4px',
          codeFontFamily: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
          codeFontSize: '13px',
          frames: {
            editorTabBarBackground: '#121211',
            terminalTitlebarBackground: '#121211',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
      components: {
        Head: './src/components/overrides/Head.astro',
        ThemeProvider: './src/components/overrides/ThemeProvider.astro',
        Header: './src/components/overrides/Header.astro',
        Search: './src/components/overrides/Search.astro',
        ThemeSelect: './src/components/overrides/ThemeSelect.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
        TableOfContents: './src/components/overrides/TableOfContents.astro',
        MobileTableOfContents: './src/components/overrides/MobileTableOfContents.astro',
        Pagination: './src/components/overrides/Pagination.astro',
        Footer: './src/components/overrides/Footer.astro',
      },
      sidebar: [
        { label: 'Get started', items: [{ label: 'Quickstart', link: '/' }] },
        {
          label: 'Reference',
          items: [
            { label: 'CLI', link: '/reference/cli/' },
            { label: 'MCP tools', link: '/reference/mcp/' },
            ...openAPISidebarGroups,
          ],
        },
      ],
      plugins: [
        starlightOpenAPI([
          {
            base: 'reference/api',
            label: 'HTTP API',
            schema: './src/generated/openapi.json',
            sidebar: { collapsed: true, operations: { labels: 'operationId' } },
            // One client: the plugin then shows a label instead of a native <select> picker.
            snippets: { operation: { clients: { shell: ['curl'] } } },
          },
        ]),
        starlightLlmsTxt({
          projectName: 'Intraface',
          description:
            'Intraface boards are shared HTML pages that several people’s coding agents edit through a pull → edit → publish queue.',
          details:
            'Every page is also available as Markdown: take its URL, drop the trailing slash and add `.md` (e.g. /docs/reference/cli.md).',
          optionalLinks: [
            {
              label: 'HTTP API reference (one Markdown file per operation)',
              url: 'https://intraface.cc/docs/llms-api.txt',
              description: 'Every HTTP API operation, generated from the route contract',
            },
          ],
        }),
      ],
    }),
  ],
});
