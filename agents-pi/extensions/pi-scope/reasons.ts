import type { ScopeRules } from "./config.ts";

const formatRoots = (roots: readonly string[]): string => roots.join(", ");

/** The model reads this; the operator reads the notification. Both name the path. */
export const scopeReason = (rules: ScopeRules, target: string): string =>
	`Blocked by pi-scope: ${target} is outside the allowed roots. ` +
	`scopePaths: ${formatRoots(rules.scopeRoots)}. ` +
	`foldersException: ${formatRoots(rules.exceptionRoots) || "none"}. ` +
	`Add it to ${rules.configPath} instead of retrying.`;

export const ignoreReason = (rules: ScopeRules, target: string): string =>
	`Blocked by pi-scope: ${target} is ignored by ignoreFolders/ignorePaths. ` +
	`Folders: ${rules.ignoreFolders.join(", ") || "none"}. ` +
	`Globs: ${rules.ignorePaths.join(", ") || "none"}. ` +
	`Change ${rules.configPath} instead of retrying.`;

export const misconfigReason = (error: string, configPath: string | undefined): string =>
	`Blocked by pi-scope: the rules are unusable (${error}). ` +
	`Fix or delete ${configPath ?? "the rules file"}, then run /pi-scope reload.`;

/** One paragraph, no markup: it is injected into every request. */export const promptSection = (rules: ScopeRules): string => {
	const ignored = [...rules.ignoreFolders, ...rules.ignorePaths];
	const lines = [
		`File reads, and grep/find/ls when available, are restricted to: ${formatRoots(rules.scopeRoots)}.`,
		`Also readable: ${formatRoots(rules.exceptionRoots) || "nothing"}.`,
		ignored.length > 0 ? `Never searched (pruned by .ignore): ${ignored.join(", ")}.` : "",
		rules.enforceBash ? "Bash commands naming a path outside that scope are blocked too." : "",
		"Calls outside that scope are blocked by policy with no approval path; do not retry them.",
	].filter((line) => line !== "");
	return lines.join(" ");
};

/** `/pi-scope` with no arguments. */
export const statusReport = (rules: ScopeRules, blocks: number, logPath: string, lsFiltering: boolean): string[] => [
	`rules: ${rules.configPath}`,
	`scopePaths: ${formatRoots(rules.scopeRoots)}`,
	`foldersException: ${formatRoots(rules.exceptionRoots) || "none"}`,
	`ignoreFolders: ${rules.ignoreFolders.join(", ") || "none"}`,
	`ignorePaths: ${rules.ignorePaths.join(", ") || "none"}`,
	`enforceBash: ${rules.enforceBash ? "on (absolute paths only)" : "off"}`,
	`gated tools: read, grep, find, ls${rules.enforceBash ? ", bash" : ""}`,
	`blocks this session: ${blocks}`,
	`block log: ${logPath}`,
	`ls filtering: ${lsFiltering ? "active" : "not declared in this harness, nothing to filter"}`,
];
