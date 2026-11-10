// Impeccable design hook for Pi: after a direct edit or write of a UI file,
// run the detector on that file and append its findings to the tool result so
// the agent sees them right away. Stays silent when the file is clean.
// Mirrors the Claude Code post-tool-use hook (see the impeccable skill's
// reference/hooks.md); `hook.enabled: false` in .impeccable/config.json or
// IMPECCABLE_HOOK_DISABLED=1 turns it off.
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const UI_EXTENSIONS = new Set(['.tsx', '.jsx', '.html', '.vue', '.svelte', '.astro', '.css', '.scss', '.sass', '.less', '.ts', '.js']);
const MAX_CHARS = 6000;

function disabled(cwd: string): boolean {
	if (process.env.IMPECCABLE_HOOK_DISABLED) return true;
	try {
		const config = JSON.parse(readFileSync(resolve(cwd, '.impeccable/config.json'), 'utf8')) as { hook?: { enabled?: boolean } };
		return config.hook?.enabled === false;
	} catch {
		return false;
	}
}

function detect(cwd: string, file: string, signal?: AbortSignal): Promise<string> {
	const launcher = resolve(cwd, '.pi/skills/impeccable/scripts/impeccable');
	return new Promise((done) => {
		execFile(launcher, ['detect', '--json', file], { cwd, signal, timeout: 60_000, maxBuffer: 1 << 20 }, (_error, stdout) => done(String(stdout ?? '')));
	});
}

export default function (pi: ExtensionAPI) {
	pi.on('tool_result', async (event, ctx) => {
		if (event.isError || !/(^|[_-])(edit|write)$/.test(event.toolName)) return;
		const raw = (event.input as { path?: unknown }).path;
		if (typeof raw !== 'string' || !UI_EXTENSIONS.has(extname(raw))) return;
		if (disabled(ctx.cwd)) return;
		const file = isAbsolute(raw) ? raw : resolve(ctx.cwd, raw);
		if (!existsSync(file) || !existsSync(resolve(ctx.cwd, '.pi/skills/impeccable/scripts/impeccable'))) return;

		let findings: Array<{ antipattern: string; description: string; severity?: string; line?: number; snippet?: string }> = [];
		try {
			findings = JSON.parse(await detect(ctx.cwd, file, ctx.signal));
		} catch {
			return;
		}
		if (!Array.isArray(findings) || findings.length === 0) return;
		const lines = findings.slice(0, 5).map((f) => `- ${f.antipattern}${f.line ? ` (line ${f.line})` : ''}: ${f.description}${f.snippet ? ` [${f.snippet}]` : ''}`);
		const note = `\n\nimpeccable detector, ${raw}: ${findings.length} finding${findings.length === 1 ? '' : 's'}\n${lines.join('\n').slice(0, MAX_CHARS)}\nFix real design problems; for a confident false positive use \`.pi/skills/impeccable/scripts/impeccable hooks ignore-value\` with a reason.`;
		return { content: [...event.content, { type: 'text' as const, text: note }] };
	});
}
