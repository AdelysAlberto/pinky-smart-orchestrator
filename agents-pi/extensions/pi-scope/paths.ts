import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const probeRealpath = (value: string): string | undefined => {
	try {
		return realpathSync.native(value);
	} catch {
		return undefined;
	}
};

/**
 * Resolve symlinks on the deepest existing ancestor and reattach the missing
 * tail. `realpath` alone fails for a path that does not exist yet, and a plain
 * `path.resolve` would miss macOS aliases such as `/tmp -> /private/tmp`.
 */
export const realpathDeep = (value: string): string => {
	const suffix: string[] = [];
	let current = path.resolve(value);
	for (;;) {
		const resolved = probeRealpath(current);
		if (resolved !== undefined) return suffix.length === 0 ? resolved : path.join(resolved, ...suffix.reverse());
		const parent = path.dirname(current);
		if (parent === current) return path.resolve(value);
		suffix.push(path.basename(current));
		current = parent;
	}
};

export const expandHome = (value: string): string => {
	if (value === "~") return homedir();
	if (value.startsWith("~/")) return path.join(homedir(), value.slice(2));
	return value;
};

/** Normalize a config entry to an absolute, symlink-free root. */
export const toRoot = (value: string): string => realpathDeep(expandHome(value));

/** True when `child` is `parent` or lives below it. Prefix-safe. */
export const isInside = (child: string, parent: string): boolean => {
	const relative = path.relative(parent, child);
	return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

export const isAllowed = (target: string, roots: readonly string[]): boolean =>
	roots.some((root) => isInside(target, root));

/** Absolute, symlink-free target for a tool path argument (default: cwd). */
export const resolveTarget = (target: string | undefined, cwd: string): string =>
	realpathDeep(path.resolve(cwd, expandHome(target ?? ".")));

export const toPosix = (value: string): string => value.split(path.sep).join("/");

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Gitignore-flavoured glob to anchored RegExp: `**` crosses separators, `*` does not. */
export const globToRegExp = (glob: string): RegExp => {
	let source = "";
	for (let index = 0; index < glob.length; index += 1) {
		const char = glob[index];
		if (char === "*") {
			if (glob[index + 1] === "*") {
				index += 1;
				if (glob[index + 1] === "/") {
					index += 1;
					source += "(?:.*/)?";
				} else {
					source += ".*";
				}
				continue;
			}
			source += "[^/]*";
			continue;
		}
		if (char === "?") {
			source += "[^/]";
			continue;
		}
		source += escapeRegExp(char);
	}
	return new RegExp(`^${source}$`);
};

/**
 * Match a directory or path against `ignoreFolders`. A bare name matches any
 * segment at any depth; an entry containing `/` matches the joined path.
 */
export const matchesIgnoreFolder = (target: string, folders: readonly string[]): boolean => {
	const posix = toPosix(target);
	const segments = posix.split("/").filter(Boolean);
	return folders.some((folder) => {
		const trimmed = folder.replace(/^\/+|\/+$/g, "");
		if (trimmed === "") return false;
		return trimmed.includes("/") ? posix.includes(trimmed) : segments.includes(trimmed);
	});
};

export const matchesIgnorePath = (target: string, patterns: readonly string[]): boolean => {
	const posix = toPosix(target);
	return patterns.some((pattern) => globToRegExp(pattern).test(posix));
};
