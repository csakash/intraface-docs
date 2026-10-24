// protects=each page's .md (what agents read and what the Agent view shows) is clean Markdown at the URL the page
// links to; fails_when=imports or HTML-only components leak into the .md, tabs lose their labels, code inside fences
// is rewritten, or a .md URL breaks the "page URL minus slash plus .md" rule; no_claim=that the HTML page renders
import { describe, expect, it } from 'vitest';
import { mdUrl, mdxToMarkdown } from '../src/lib/md';

describe('mdUrl', () => {
  it('drops the trailing slash and adds .md', () => {
    expect(mdUrl('/docs/reference/cli/')).toBe('/docs/reference/cli.md');
    expect(mdUrl('/docs/reference/api/operations/publishescreate/')).toBe('/docs/reference/api/operations/publishescreate.md');
  });
  it('maps the docs home to index.md', () => {
    expect(mdUrl('/docs/')).toBe('/docs/index.md');
    expect(mdUrl('/docs')).toBe('/docs/index.md');
    expect(mdUrl('/docs/index.html')).toBe('/docs/index.md');
  });
});

describe('mdxToMarkdown', () => {
  const body = [
    "import { Tabs, TabItem } from '@astrojs/starlight/components';",
    "import Sim from '../../components/Sim.astro';",
    '',
    'Intro paragraph.',
    '',
    '<Sim />',
    '',
    '{/* a note for authors */}',
    '<Tabs syncKey="agent">',
    '<TabItem label="Claude Code">',
    '',
    'Run this.',
    '',
    '</TabItem>',
    "<TabItem label='Cursor'>",
    'Or this.',
    '</TabItem>',
    '</Tabs>',
    '',
    '<Steps>',
    '1. **Pull.** First.',
    '</Steps>',
    '',
    '```md',
    "import x from 'kept-inside-a-fence';",
    '<Sim />',
    '```',
  ].join('\n');
  const md = mdxToMarkdown({ title: 'Quickstart', description: 'Five minutes.', body });

  it('starts with the title and the description', () => {
    expect(md.startsWith('# Quickstart\n\n> Five minutes.\n\nIntro paragraph.')).toBe(true);
  });
  it('drops imports, comments, HTML-only components and wrapper tags', () => {
    const outside = md.split('```')[0] ?? '';
    expect(outside).not.toMatch(/^import /m);
    expect(outside).not.toContain('<Sim');
    expect(outside).not.toContain('a note for authors');
    expect(md).not.toMatch(/<\/?(Tabs|TabItem|Steps)\b/);
    expect(md).toContain('1. **Pull.** First.');
  });
  it('turns tabs into ### sections', () => {
    expect(md).toContain('### Claude Code\n\nRun this.');
    expect(md).toContain('### Cursor\n\nOr this.');
  });
  it('leaves fenced code alone', () => {
    expect(md).toContain("```md\nimport x from 'kept-inside-a-fence';\n<Sim />\n```");
  });
  it('expands a generated reference instead of dropping it', () => {
    const out = mdxToMarkdown({ title: 'CLI', body: 'Top.\n\n<CliRef />\n' }, { CliRef: () => '## Commands' });
    expect(out).toBe('# CLI\n\nTop.\n\n## Commands\n');
  });
});
