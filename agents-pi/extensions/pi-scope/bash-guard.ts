import { isAllowed, realpathDeep } from "./paths.ts";
import { homedir } from "node:os";

/**
 * Conservative `bash` guard: only absolute paths written in the command are
 * checked. Relative paths, shell variables and paths built inside a script stay
 * out of reach, so this raises the floor without promising airtight isolation.
 */

/** Executables and devices a command legitimately names outside the scope. */
const SYSTEM_PREFIXES = [
	"/usr",
	"/bin",
	"/sbin",
	"/dev",
	"/opt/homebrew",
	"/opt/local",
	"/System",
	"/Library",
	"/private/var/db",
];

const PATH_TOKEN = /(?:^|[\s"'=(,])((?:\$HOME|\$\{HOME\}|~)?\/[^\s"'`|&;()<>]*)/g;
/**
 * Bare `~` and `$HOME` only count as paths after a directory command, where they
 * change the working directory instead of being an operator or a word.
 */
const HOME_TOKEN = /(?:^|[\s;&|(])(?:cd|pushd|chdir)\s+(~|\$HOME|\$\{HOME\})(?=[\s;&|)]|$)/g;

const stripTrailing = (value: string): string => value.replace(/[.,;:]+$/, "");

/** Commands whose quoted argument runs on another machine, not on this filesystem. */
const REMOTE_COMMANDS = new Set(["ssh", "scp", "sftp", "mosh", "rsync"]);
const CONTAINER_EXEC = /^(?:docker|podman)\s+(?:exec|run\s+-it\s+\S+\s+sh)\b|^(?:pct|qm)\s+(?:exec|guest\s+exec)\b|^lxc-attach\b/;

const stripQuoted = (command: string): string => command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, " ");

const firstWord = (command: string): string => {
	for (const token of command.trim().split(/\s+/)) {
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;
		return token;
	}
	return "";
};

const isSystemPath = (target: string): boolean =>
	SYSTEM_PREFIXES.some((prefix) => target === prefix || target.startsWith(`${prefix}/`));

const expand = (candidate: string): string => {
	if (candidate === "~") return homedir();
	if (candidate === "$HOME" || candidate === "${HOME}") return homedir();
	if (candidate.startsWith("~/")) return `${homedir()}${candidate.slice(1)}`;
	if (candidate.startsWith("$HOME/")) return `${homedir()}${candidate.slice(5)}`;
	if (candidate.startsWith("${HOME}/")) return `${homedir()}${candidate.slice(7)}`;
	return candidate;
};

/** Absolute paths mentioned in a shell command, in order of appearance. */
export const extractPaths = (command: string): string[] => {
	const found: Array<{ index: number; value: string }> = [];
	for (const match of command.matchAll(PATH_TOKEN)) {
		const raw = match[1];
		if (raw === undefined) continue;
		const candidate = stripTrailing(raw).replace(/\\(.)/g, "$1");
		if (candidate === "" || candidate === "//") continue;
		found.push({ index: match.index ?? 0, value: candidate });
	}
	for (const match of command.matchAll(HOME_TOKEN)) {
		const value = match[1];
		if (value === undefined) continue;
		found.push({ index: match.index ?? 0, value });
	}
	return found.sort((left, right) => left.index - right.index).map((entry) => entry.value);
};

/**
 * The first path in `command` that resolves outside every allowed root, or
 * undefined when the command looks contained.
 */
export const findEscapingPath = (command: string, allowedRoots: readonly string[]): string | undefined => {
	if (CONTAINER_EXEC.test(command.trim())) return undefined;
	const remote = REMOTE_COMMANDS.has(firstWord(command));
	const scanned = remote ? stripQuoted(command) : command;
	for (const candidate of extractPaths(scanned)) {
		const expanded = expand(candidate);
		if (!expanded.startsWith("/")) continue;
		const target = realpathDeep(expanded);
		if (isSystemPath(target)) continue;
		if (isAllowed(target, allowedRoots)) continue;
		return target;
	}
	return undefined;
};
