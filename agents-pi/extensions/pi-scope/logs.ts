import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { getAgentDir, withFileMutationQueue } from "@earendil-works/pi-coding-agent";

export type BlockKind = "scope" | "ignore" | "bash" | "misconfig";

export type BlockEvent = {
	ts: string;
	tool: string;
	kind: BlockKind;
	target: string;
	rule: string;
};

/** One JSONL line per blocked call, so a denied search is never invisible. */
export const blockLogPath = (): string => path.join(getAgentDir(), "pi-scope-blocks.jsonl");

export const recordBlock = async (event: BlockEvent): Promise<void> => {
	const file = blockLogPath();
	try {
		await withFileMutationQueue(file, () => appendFile(file, `${JSON.stringify(event)}\n`, "utf-8"));
	} catch {
		// A guard must never fail because its audit trail is unwritable.
	}
};

export const readRecentBlocks = async (limit: number): Promise<BlockEvent[]> => {
	let raw: string;
	try {
		raw = await readFile(blockLogPath(), "utf-8");
	} catch {
		return [];
	}
	const events: BlockEvent[] = [];
	for (const line of raw.split("\n").slice(-limit * 2)) {
		if (line.trim() === "") continue;
		try {
			events.push(JSON.parse(line) as BlockEvent);
		} catch {
			continue;
		}
	}
	return events.slice(-limit);
};

export const formatBlockEvent = (event: BlockEvent): string => {
	const time = event.ts.slice(11, 19);
	return `${time} ${event.tool} ${event.kind} ${event.target}`;
};
