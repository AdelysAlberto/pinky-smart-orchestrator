import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import type { ScopeRules } from "./config.ts";

const BLOCK_BEGIN = "# >>> pi-scope";
const BLOCK_END = "# <<< pi-scope";

export type SyncResult =
	| { success: true; data: { ignorePath: string; written: boolean } | null }
	| { success: false; error: string };

const ignoreEntries = (rules: ScopeRules): string[] => {
	const folders = rules.ignoreFolders.map((folder) => (folder.includes("/") ? folder : `${folder}/`));
	return [...folders, ...rules.ignorePaths];
};

export const renderIgnoreBlock = (rules: ScopeRules): string => {
	const entries = ignoreEntries(rules);
	if (entries.length === 0) return "";
	const header = [
		BLOCK_BEGIN,
		`# Generated from ${rules.configPath}. Edits inside this block are overwritten;`,
		"# keep your own patterns outside it.",
	];
	return [...header, ...entries, BLOCK_END].join("\n");
};

/** Remove a previously generated block, leaving everything the operator wrote. */
const stripBlock = (content: string): { kept: string; hadBlock: boolean } => {
	const lines = content.split("\n");
	const begin = lines.findIndex((line) => line.trim() === BLOCK_BEGIN);
	if (begin === -1) return { kept: content, hadBlock: false };
	const end = lines.findIndex((line, index) => index > begin && line.trim() === BLOCK_END);
	const kept = end === -1 ? lines.slice(0, begin) : [...lines.slice(0, begin), ...lines.slice(end + 1)];
	return { kept: kept.join("\n").replace(/\s+$/, ""), hadBlock: true };
};

const compose = (kept: string, block: string): string => {
	if (block === "") return kept;
	return kept === "" ? `${block}\n` : `${kept}\n\n${block}\n`;
};

/**
 * `.ignore` is honoured by both ripgrep and fd, including from subdirectories,
 * so one file per scope root reaches the `grep` and `find` tools without
 * changing their contract. Written only when the content changes.
 */
export const syncIgnoreFile = async (rules: ScopeRules, root: string): Promise<SyncResult> => {
	const ignorePath = path.join(root, ".ignore");
	const block = renderIgnoreBlock(rules);

	try {
		const existing = await withFileMutationQueue(ignorePath, async () => {
			try {
				return await readFile(ignorePath, "utf-8");
			} catch {
				return "";
			}
		});
		const { kept, hadBlock } = stripBlock(existing);
		const next = compose(kept, block);
		if (next === existing) return { success: true, data: { ignorePath, written: false } };
		if (next === "" && !hadBlock) return { success: true, data: null };

		await withFileMutationQueue(ignorePath, async () => {
			if (next === "") {
				await writeFile(ignorePath, "", "utf-8");
				return;
			}
			await writeFile(ignorePath, next, "utf-8");
		});
		return { success: true, data: { ignorePath, written: true } };
	} catch (error) {
		return { success: false, error: `${ignorePath}: ${(error as Error).message}` };
	}
};
