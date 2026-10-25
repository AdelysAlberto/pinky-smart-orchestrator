import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { toRoot } from "./paths.ts";

export const CONFIG_FILENAME = "pi-rules.json";

/** Environment override for the rules file; otherwise discovered from cwd upwards. */
const CONFIG_ENV = "PI_SCOPE_RULES";

const ALLOWED_KEYS = new Set([
	"$schema",
	"$comment",
	"enabled",
	"enforceBash",
	"scopePaths",
	"foldersException",
	"ignoreFolders",
	"ignorePaths",
]);

const MAX_WALK_DEPTH = 12;

export type ScopeRules = {
	readonly configPath: string;
	readonly scopeRoots: readonly string[];
	readonly exceptionRoots: readonly string[];
	readonly ignoreFolders: readonly string[];
	readonly ignorePaths: readonly string[];
	readonly enforceBash: boolean;
};

/** `data: null` means the guard is disabled: no config file, or `enabled: false`. */
export type ConfigResult = { success: true; data: ScopeRules | null } | { success: false; error: string };

type ArrayResult = { success: true; data: string[] } | { success: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (value: unknown, key: string, required: boolean): ArrayResult => {
	if (value === undefined) {
		if (required) return { success: false, error: `"${key}" is required` };
		return { success: true, data: [] };
	}
	if (!Array.isArray(value)) return { success: false, error: `"${key}" must be an array of strings` };
	const entries: string[] = [];
	for (const [index, entry] of value.entries()) {
		if (typeof entry !== "string" || entry.trim() === "") {
			return { success: false, error: `"${key}[${index}]" must be a non-empty string` };
		}
		entries.push(entry.trim());
	}
	if (required && entries.length === 0) {
		return { success: false, error: `"${key}" must list at least one path` };
	}
	return { success: true, data: entries };
};

export const discoverConfigPath = (cwd: string): string | undefined => {
	const fromEnv = process.env[CONFIG_ENV]?.trim();
	if (fromEnv) return path.resolve(cwd, fromEnv);

	let current = path.resolve(cwd);
	for (let depth = 0; depth < MAX_WALK_DEPTH; depth += 1) {
		const candidate = path.join(current, CONFIG_FILENAME);
		if (existsSync(candidate)) return candidate;
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}

	const fallback = path.join(getAgentDir(), CONFIG_FILENAME);
	return existsSync(fallback) ? fallback : undefined;
};

export const loadRules = (cwd: string): ConfigResult => {
	const configPath = discoverConfigPath(cwd);
	if (configPath === undefined) return { success: true, data: null };

	let raw: string;
	try {
		raw = readFileSync(configPath, "utf-8");
	} catch (error) {
		return { success: false, error: `cannot read ${configPath}: ${(error as Error).message}` };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		return { success: false, error: `${configPath} is not valid JSON: ${(error as Error).message}` };
	}

	if (!isRecord(parsed)) return { success: false, error: `${configPath} must contain a JSON object` };

	const unknownKeys = Object.keys(parsed).filter((key) => !ALLOWED_KEYS.has(key));
	if (unknownKeys.length > 0) {
		return { success: false, error: `${configPath} has unknown keys: ${unknownKeys.join(", ")}` };
	}

	if (parsed.enabled !== undefined && typeof parsed.enabled !== "boolean") {
		return { success: false, error: `"enabled" must be a boolean` };
	}
	if (parsed.enforceBash !== undefined && typeof parsed.enforceBash !== "boolean") {
		return { success: false, error: `"enforceBash" must be a boolean` };
	}
	if (parsed.enabled === false) return { success: true, data: null };

	const scopePaths = readStringArray(parsed.scopePaths, "scopePaths", true);
	if (!scopePaths.success) return { success: false, error: `${configPath}: ${scopePaths.error}` };
	const foldersException = readStringArray(parsed.foldersException, "foldersException", false);
	if (!foldersException.success) return { success: false, error: `${configPath}: ${foldersException.error}` };
	const ignoreFolders = readStringArray(parsed.ignoreFolders, "ignoreFolders", false);
	if (!ignoreFolders.success) return { success: false, error: `${configPath}: ${ignoreFolders.error}` };
	const ignorePaths = readStringArray(parsed.ignorePaths, "ignorePaths", false);
	if (!ignorePaths.success) return { success: false, error: `${configPath}: ${ignorePaths.error}` };

	const scopeRoots = [...new Set(scopePaths.data.map(toRoot))];
	const exceptionRoots = [...new Set(foldersException.data.map(toRoot))];

	return {
		success: true,
		data: {
			configPath,
			scopeRoots,
			exceptionRoots,
			ignoreFolders: ignoreFolders.data,
			ignorePaths: ignorePaths.data,
			enforceBash: parsed.enforceBash === true,
		},
	};
};

/** Config mtime, or undefined when the file vanished. Drives live reload. */
export const rulesMtime = (configPath: string): number | undefined => {
	try {
		return statSync(configPath).mtimeMs;
	} catch {
		return undefined;
	}
};
