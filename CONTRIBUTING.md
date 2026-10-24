# Contributing

Thanks for helping. Small fixes (typos, unclear sentences, broken examples) are welcome as pull requests straight away.
For a new page or a larger change, open an issue first so we can agree on where it goes.

## Writing

- Short sentences, plain words, active voice. Say what the reader does and what happens.
- One idea per paragraph. Put commands in fenced code blocks with a `title`.
- Every page needs a `title` and a `description` of 50–155 characters (it becomes the search snippet).
- Link to other pages with their full path, e.g. `/docs/reference/cli/`.
- Interactive components (`src/components/`) are for the HTML page only. Write the prose next to them so the
  Markdown version of the page still says everything.

## Don't edit

- `src/generated/*.json`: generated from the Intraface source.
- `dist/`: build output.

## Checks

Before you open a pull request:

```sh
pnpm build   # fails if any page loses its h1, canonical, description, JSON-LD or Markdown twin
pnpm test
```
