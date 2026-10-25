import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createLsToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ScopeRules } from "./config.ts";
import { matchesIgnoreFolder, matchesIgnorePath } from "./paths.ts";

type RulesGetter = () => ScopeRules | null;

const isIgnoredEntry = (rules: ScopeRules, absolutePath: string, entry: string): boolean =>
	matchesIgnoreFolder(entry, rules.ignoreFolders) || matchesIgnorePath(absolutePath, rules.ignorePaths);

/**
 * `ls` reads directory entries directly, so `.ignore` never reaches it. The
 * built-in definition is reused with filtered operations, which keeps entry
 * limits, truncation notices and the renderer intact.
 */
export const createFilteredLsDefinition = (cwd: string, getRules: RulesGetter) =>
	createLsToolDefinition(cwd, {
		operations: {
			exists: async (target: string) => {
				try {
					await access(target);
					return true;
				} catch {
					return false;
				}
			},
			stat: (target: string) => stat(target),
			readdir: async (target: string) => {
				const entries = await readdir(target);
				const rules = getRules();
				if (rules === null) return entries;
				return entries.filter((entry) => !isIgnoredEntry(rules, path.join(target, entry), entry));
			},
		},
	});
