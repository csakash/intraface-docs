# Intraface Docs

The source of [intraface.cc/docs](https://intraface.cc/docs/): how to connect Claude Code, Codex, Copilot or Cursor to a
shared Intraface board, plus the CLI, MCP and HTTP API references.

Built with [Astro Starlight](https://starlight.astro.build). Every push to `main` deploys through Cloudflare Workers
Builds.

## Edit a page

Pages are Markdown (MDX) files in [`src/content/docs/`](src/content/docs/). Each page has an "Edit on GitHub" link that
opens its file here. See [CONTRIBUTING.md](CONTRIBUTING.md).

Every page is also served as Markdown for agents: take its URL, drop the trailing slash and add `.md`
(`/docs/reference/cli/` → `/docs/reference/cli.md`). `/docs/llms.txt`, `/docs/llms-full.txt` and `/docs/llms-api.txt`
list them.

## Run it

Needs Node.js 22.23.4 or newer (`.node-version` pins 24.18.0) and pnpm.

```sh
pnpm install
pnpm dev            # http://localhost:4103/docs/ (search needs a build)
pnpm build          # dist/docs + post-build SEO checks (scripts/check-build.mjs)
pnpm preview        # serves dist/ with Wrangler, exactly as production does
pnpm test           # unit tests
pnpm e2e            # Playwright against the preview
```

## Generated references

`src/generated/{openapi,mcp-tools,cli}.json` are generated from the Intraface source by `pnpm docs:refs` in the main
repository. Don't edit them by hand; open an issue if a reference is wrong.

## How it's served

`intraface.cc` belongs to the landing page's Worker. It forwards `/docs/*` to this repo's `intraface-docs` Worker over a
service binding. The build writes to `dist/docs/`, so file paths match URL paths.

## Licence

Content (`src/content/`) is [CC BY 4.0](LICENSE-CONTENT). Code is [MIT](LICENSE).
