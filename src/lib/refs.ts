import cli from '../generated/cli.json';
import mcp from '../generated/mcp-tools.json';

/** The CLI and MCP references, from the files `pnpm docs:refs` writes (human-agent-collab/docs-refs). */

export interface CliArg {
  name: string;
  type: string;
  description?: string;
  default?: unknown;
  alias?: string[];
  required?: boolean;
}
export interface CliCommand {
  name: string;
  description?: string;
  args: CliArg[];
  subcommands: CliCommand[];
}
export interface McpTool {
  name: string;
  description: string;
  inputSchema: { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
  annotations: Record<string, boolean>;
}

export const CLI = cli as { commands: CliCommand[]; exitCodes: Array<{ code: number; name: string; description: string }> };
export const MCP_TOOLS = (mcp as unknown as { tools: McpTool[] }).tools;

/** Flags every command takes; listed once at the top of the CLI page instead of under every command. */
export const COMMON_FLAGS = ['json', 'api'];

const MCP_GROUPS: Array<[string, string[]]> = [
  ['Read', ['list_boards', 'get_board', 'pull_board', 'read_file', 'list_versions', 'get_diff']],
  ['Write', ['create_board', 'publish']],
  ['Assets', ['presign_upload', 'upload_asset', 'import_assets']],
  ['Comments', ['list_comments', 'reply_comment', 'resolve_comment']],
];

/** Tools grouped for the reference. A tool the map doesn't know goes under "Other", so a new tool never disappears. */
export function mcpGroups(tools: McpTool[] = MCP_TOOLS): Array<[string, McpTool[]]> {
  const known = new Set(MCP_GROUPS.flatMap(([, names]) => names));
  const groups: Array<[string, McpTool[]]> = MCP_GROUPS.map(([label, names]) => [
    label,
    names.map((n) => tools.find((t) => t.name === n)).filter((t): t is McpTool => Boolean(t)),
  ]);
  const other = tools.filter((t) => !known.has(t.name));
  if (other.length) groups.push(['Other', other]);
  return groups.filter(([, list]) => list.length > 0);
}

const flag = (a: CliArg) => {
  const alias = a.alias?.length ? ` (${a.alias.map((x) => `-${x}`).join(', ')})` : '';
  const pos = a.type === 'positional';
  const name = pos ? `<${a.name}>` : `--${a.name}${a.type === 'string' ? ' <value>' : ''}`;
  const def = a.default !== undefined && a.default !== false ? ` Default: \`${String(a.default)}\`.` : '';
  return `- \`${name}\`${alias}${a.required ? ' (required)' : ''}: ${a.description ?? ''}${def}`.trimEnd();
};

export function cliMarkdown(ref = CLI): string {
  const lines: string[] = ['## Flags every command takes', ''];
  const first = ref.commands[0];
  for (const a of first?.args.filter((x) => COMMON_FLAGS.includes(x.name)) ?? []) lines.push(flag(a));
  lines.push('', '## Commands', '');
  const walk = (c: CliCommand, prefix: string) => {
    lines.push(`### intraface ${prefix}${c.name}`, '');
    if (c.description) lines.push(c.description, '');
    const own = c.args.filter((a) => !COMMON_FLAGS.includes(a.name));
    if (own.length) lines.push(...own.map(flag), '');
    for (const s of c.subcommands) walk(s, `${prefix}${c.name} `);
  };
  for (const c of ref.commands) walk(c, '');
  lines.push('## Exit codes', '', '| Code | Name | Means |', '|---|---|---|');
  for (const e of ref.exitCodes) lines.push(`| ${e.code} | ${e.name} | ${e.description} |`);
  return lines.join('\n');
}

export function mcpMarkdown(tools: McpTool[] = MCP_TOOLS): string {
  const lines: string[] = [];
  for (const [group, list] of mcpGroups(tools)) {
    lines.push(`## ${group}`, '');
    for (const t of list) {
      const hints = Object.entries(t.annotations)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/Hint$/, ''));
      lines.push(`### ${t.name}${hints.length ? ` (${hints.join(', ')})` : ''}`, '', t.description, '');
      const req = new Set(t.inputSchema.required ?? []);
      for (const [name, p] of Object.entries(t.inputSchema.properties ?? {})) {
        lines.push(`- \`${name}\` (${p.type ?? 'value'}${req.has(name) ? ', required' : ''})${p.description ? `: ${p.description}` : ''}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd();
}
