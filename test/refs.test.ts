// protects=the CLI and MCP reference pages (and their .md) cover every command, exit code and tool in the generated
// files; fails_when=a command, subcommand, exit code or tool is dropped, or a new MCP tool disappears because the
// group map doesn't know it; no_claim=that the generated files are current (human-agent-collab's snapshots guard that)
import { describe, expect, it } from 'vitest';
import { CLI, cliMarkdown, MCP_TOOLS, mcpGroups, mcpMarkdown } from '../src/lib/refs';

describe('CLI reference', () => {
  it('lists every command, subcommand and exit code', () => {
    const md = cliMarkdown();
    for (const c of CLI.commands) {
      expect(md).toContain(`### intraface ${c.name}\n`);
      for (const s of c.subcommands) expect(md).toContain(`### intraface ${c.name} ${s.name}\n`);
    }
    expect(CLI.exitCodes.map((e) => e.code)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const e of CLI.exitCodes) expect(md).toContain(`| ${e.code} | ${e.name} |`);
  });
});

describe('MCP reference', () => {
  it('groups all 16 tools into Read, Write, Assets and Comments', () => {
    const groups = mcpGroups();
    expect(groups.map(([g]) => g)).toEqual(['Read', 'Write', 'Assets', 'Comments']);
    expect(groups.flatMap(([, t]) => t).length).toBe(MCP_TOOLS.length);
    expect(MCP_TOOLS.length).toBe(16);
  });
  it('puts a tool the map does not know under Other', () => {
    const extra = { name: 'new_tool', description: 'New.', inputSchema: {}, annotations: {} };
    const groups = mcpGroups([...MCP_TOOLS, extra]);
    expect(groups.at(-1)).toEqual(['Other', [extra]]);
  });
  it('writes every tool into the .md', () => {
    const md = mcpMarkdown();
    for (const t of MCP_TOOLS) expect(md).toContain(`### ${t.name}`);
  });
});
