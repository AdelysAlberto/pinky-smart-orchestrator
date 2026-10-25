/**
 * Prose lint.
 *
 * The WRITING block in `APPEND_SYSTEM.md` forbids the tells catalogued by
 * Wikipedia:Signs_of_AI_writing. Prose rules decay; a regex does not. This
 * extension audits the Markdown the model just wrote and reports the hits back
 * in the tool result, so the same turn can repair them.
 *
 * Non-blocking by design: the report travels with the result, the write is
 * already on disk, and a false positive costs one clause of explanation. Reports
 * only, never rewrites the file.
 *
 * Configuration (environment variables):
 *   PI_PROSE_LINT_DISABLE  any value disables the audit
 *   PI_PROSE_LINT_SKIP     comma-separated path substrings to ignore
 *                          (default: APPEND_SYSTEM.md, the file that lists every
 *                          banned phrase by design)
 *   PI_PROSE_LINT_QUIET    1 hides the UI notification, keeps the report
 *
 * Opt out per file with the marker `prose-lint:off` anywhere in the text.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PATTERNS, type ProseHit, type ProseThreshold, RULE_TITLES, type RuleId, THRESHOLDS } from "./patterns.ts";

const LINTABLE_EXTENSIONS = [".md", ".mdx", ".markdown"];
const DEFAULT_SKIP = "APPEND_SYSTEM.md";
const MAX_HITS_PER_RULE = 3;
const MAX_EXCERPT = 88;
const OFF_MARKER = /prose-lint:\s*off/i;

export interface ProseReport {
	readonly hits: readonly ProseHit[];
	readonly ruleCounts: Readonly<Record<RuleId, number>>;
	readonly words: number;
}

const emptyCounts = (): Record<RuleId, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });

const clip = (text: string): string =>
	text.length <= MAX_EXCERPT ? text : `${text.slice(0, MAX_EXCERPT - 1)}…`;

/** Blank out code so fenced examples and inline code are never reported. */
const maskCode = (text: string): string => {
	const blank = (match: string): string => match.replace(/[^\n]/g, " ");
	return text.replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]*`/g, blank);
};

export const isLintablePath = (path: string): boolean => {
	const lower = path.toLowerCase();
	return LINTABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

const collectThresholdHits = (text: string, lines: number, words: number, counts: Record<RuleId, number>): ProseHit[] => {
	const measures: Record<ProseThreshold["metric"], { found: number; total: number }> = {
		emDash: { found: (text.match(/—/g) ?? []).length, total: words },
		bold: { found: (text.match(/\*\*[^*\n]+\*\*/g) ?? []).length, total: lines },
	};
	const hits: ProseHit[] = [];
	for (const threshold of THRESHOLDS) {
		const { found, total } = measures[threshold.metric];
		if (found === 0 || total === 0 || total / found >= threshold.limit) continue;
		counts[threshold.rule] += 1;
		hits.push({
			rule: threshold.rule,
			label: `density: one ${threshold.label} every ${Math.max(1, Math.round(total / found))} ${threshold.unit}`,
			line: 1,
			excerpt: `${found} in ${total} ${threshold.unit}`,
		});
	}
	return hits;
};

export const lintProse = (raw: string): ProseReport => {
	const text = maskCode(raw);
	const lines = text.split("\n");
	const words = text.split(/\s+/).filter((word) => word !== "").length;
	const counts = emptyCounts();
	const hits: ProseHit[] = [];
	for (const pattern of PATTERNS) {
		let found = 0;
		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index];
			if (line === undefined || !pattern.re.test(line)) continue;
			counts[pattern.rule] += 1;
			found += 1;
			if (found > MAX_HITS_PER_RULE) continue;
			const lineNumber = index + 1;
			// One row per rule and line: three phrases from the same sentence are one repair.
			if (hits.some((hit) => hit.rule === pattern.rule && hit.line === lineNumber)) continue;
			hits.push({ rule: pattern.rule, label: pattern.label, line: lineNumber, excerpt: clip(line.trim()) });
		}
	}
	for (const hit of collectThresholdHits(text, lines.length, words, counts)) {
		hits.push(hit);
	}
	return { hits, ruleCounts: counts, words };
};

/** Lines carrying at least one hit; a report row is per rule and line. */
export const flaggedLineCount = (report: ProseReport): number => new Set(report.hits.map((hit) => hit.line)).size;

const formatReport = (report: ProseReport): string => {
	const ordered = [...report.hits].sort((left, right) => left.rule - right.rule || left.line - right.line);
	const rows = ordered.map(
		(hit) => `- rule ${hit.rule} (${RULE_TITLES[hit.rule]}) line ${hit.line}: ${hit.label} :: ${hit.excerpt}`,
	);
	const occurrences = Object.values(report.ruleCounts).reduce((total, count) => total + count, 0);
	const lineCount = flaggedLineCount(report);
	return [
		`prose-lint: ${lineCount} line(s) with AI tells (${occurrences} occurrence(s)) in the prose you just wrote — rules: APPEND_SYSTEM.md WRITING.`,
		...rows,
		"Rewrite those lines now. If a hit is literal (a quoted rule, a real property such as robust error handling), keep it and say why in one clause.",
	].join("\n");
};

interface AuthoredText {
	readonly path: string;
	readonly text: string;
}

const authoredText = (toolName: string, input: Record<string, unknown>): AuthoredText | undefined => {
	const path = typeof input.path === "string" ? input.path : "";
	if (path === "" || !isLintablePath(path)) return undefined;
	if (toolName === "write") {
		return typeof input.content === "string" ? { path, text: input.content } : undefined;
	}
	if (toolName !== "edit" || !Array.isArray(input.edits)) return undefined;
	const chunks = input.edits.flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return [];
		const value = (entry as Record<string, unknown>).newText;
		return typeof value === "string" ? [value] : [];
	});
	return chunks.length === 0 ? undefined : { path, text: chunks.join("\n\n") };
};

const skipTokens = (): readonly string[] => {
	const raw = process.env.PI_PROSE_LINT_SKIP;
	if (raw === undefined || raw.trim() === "") return [DEFAULT_SKIP];
	return raw.split(",").map((token) => token.trim()).filter((token) => token !== "");
};

export const isSkippedPath = (path: string): boolean => {
	const tokens = skipTokens();
	return tokens.some((token) => token === "*" || path.includes(token));
};

export default function (pi: ExtensionAPI) {
	const disabled = (process.env.PI_PROSE_LINT_DISABLE ?? "").trim() !== "";
	const quiet = (process.env.PI_PROSE_LINT_QUIET ?? "").trim() === "1";

	pi.on("tool_result", async (event, ctx) => {
		if (disabled || event.isError) return;
		const authored = authoredText(event.toolName, event.input);
		if (authored === undefined) return;
		if (isSkippedPath(authored.path) || OFF_MARKER.test(authored.text)) return;
		const report = lintProse(authored.text);
		if (report.hits.length === 0) return;
		if (!quiet && ctx.hasUI) {
			ctx.ui.notify(`prose-lint: ${flaggedLineCount(report)} flagged line(s) in ${authored.path}`, "warning");
		}
		return { content: [...event.content, { type: "text", text: formatReport(report) }] };
	});

	pi.registerCommand("prose-lint", {
		description: "Show the prose lint configuration and its pattern count",
		handler: async (_args, ctx) => {
			const state = disabled ? "disabled by PI_PROSE_LINT_DISABLE" : "enabled";
			const lines = [
				`prose-lint ${state}`,
				`${PATTERNS.length} patterns, ${THRESHOLDS.length} density checks, rules 1-8`,
				`skipped paths: ${skipTokens().join(", ")}`,
			];
			ctx.ui.notify(lines.join(" · "), "info");
		},
	});
}
