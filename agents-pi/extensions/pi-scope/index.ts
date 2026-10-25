/**
 * pi-scope: keeps file search and reads inside declared roots.
 *
 * Rules live in `pi-rules.json`, discovered from PI_SCOPE_RULES, then upwards
 * from the working directory, then in the agent directory:
 *
 *   {
 *     "scopePaths": ["/Volumes/Datos/Projects"],
 *     "foldersException": ["~/.pi/agent", "/tmp"],
 *     "ignoreFolders": ["node_modules", ".git"],
 *     "ignorePaths": ["**\/*.log"]
 *   }
 *
 * `scopePaths` gate read, grep, find and ls; `foldersException` widens them for
 * context files, skills and scratch output. `ignoreFolders` and `ignorePaths`
 * are written into a managed block of `<scope>/.ignore`, which ripgrep and fd
 * both honour from subdirectories, and are applied to `ls` by reusing the
 * built-in definition with filtered operations. Violations are blocked, never
 * prompted: a prompt would cost a turn and is unavailable to subagents.
 *
 * Configuration: PI_SCOPE_RULES (rules file path), PI_SCOPE_DISABLE=1 (off).
 * Command: /pi-scope shows state, /pi-scope reload re-reads the file.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { findEscapingPath } from "./bash-guard.ts";
import { type ScopeRules, discoverConfigPath, loadRules, rulesMtime } from "./config.ts";
import { syncIgnoreFile } from "./ignore-file.ts";
import { createFilteredLsDefinition } from "./ls-filter.ts";
import { type BlockKind, blockLogPath, formatBlockEvent, readRecentBlocks, recordBlock } from "./logs.ts";
import { ignoreReason, misconfigReason, promptSection, scopeReason, statusReport } from "./reasons.ts";
import { isAllowed, matchesIgnoreFolder, matchesIgnorePath, resolveTarget } from "./paths.ts";

type State = {
	rules: ScopeRules | null;
	error: string | null;
	configPath: string | undefined;
	mtime: number | undefined;
	lsRegistered: boolean;
	blocks: number;
};

const STATUS_KEY = "pi-scope";
const NOTIFY_TARGET_LIMIT = 90;

const createState = (): State => ({
	rules: null,
	error: null,
	configPath: undefined,
	mtime: undefined,
	lsRegistered: false,
	blocks: 0,
});

const syncIgnoreFiles = async (rules: ScopeRules): Promise<string[]> => {
	const notes: string[] = [];
	for (const root of rules.scopeRoots) {
		if (!existsSync(root)) {
			notes.push(`scope root does not exist: ${root}`);
			continue;
		}
		const result = await syncIgnoreFile(rules, root);
		if (!result.success) notes.push(result.error);
		else if (result.data?.written) notes.push(`wrote ${result.data.ignorePath}`);
	}
	return notes;
};

/** JSON and print modes have no UI; notifications must never fail a session. */
const notify = (ctx: ExtensionContext, message: string, level: "info" | "warning" | "error"): void => {
	if (ctx.hasUI) ctx.ui.notify(message, level);
};

export default function (pi: ExtensionAPI) {
	const state = createState();
	let disabled = process.env.PI_SCOPE_DISABLE?.trim() === "1";

	const applyRules = async (ctx: ExtensionContext): Promise<string[]> => {
		const result = loadRules(ctx.cwd);
		if (!result.success) {
			state.rules = null;
			state.error = result.error;
			return [result.error];
		}
		state.rules = result.data;
		state.error = null;
		if (result.data === null) return [];
		// Only filter a tool that is already declared: registering a new one would
		// add a tool the operator never enabled.
		if (!state.lsRegistered && pi.getActiveTools().includes("ls")) {
			pi.registerTool(createFilteredLsDefinition(ctx.cwd, () => state.rules));
			state.lsRegistered = true;
		}
		return syncIgnoreFiles(result.data);
	};

	/** Re-read the rules when the file is added, edited or removed mid-session. */
	const ensureFresh = async (ctx: ExtensionContext): Promise<void> => {
		if (disabled) return;
		const configPath = discoverConfigPath(ctx.cwd);
		const mtime = configPath === undefined ? undefined : rulesMtime(configPath);
		if (configPath === state.configPath && mtime === state.mtime) return;
		state.configPath = configPath;
		state.mtime = mtime;
		await applyRules(ctx);
	};

	const describe = (target: string, kind: BlockKind): string => {
		const rules = state.rules;
		if (rules === null) return misconfigReason(state.error ?? "no rules loaded", state.configPath);
		return kind === "ignore" ? ignoreReason(rules, target) : scopeReason(rules, target);
	};

	/** Deny, audit and surface the block: the model gets the reason, the operator gets a signal. */
	const deny = async (
		ctx: ExtensionContext,
		tool: string,
		kind: BlockKind,
		target: string,
		reason: string,
	): Promise<{ block: true; reason: string }> => {
		state.blocks += 1;
		await recordBlock({
			ts: new Date().toISOString(),
			tool,
			kind,
			target,
			rule: kind === "misconfig" ? (state.error ?? "unknown") : (state.rules?.configPath ?? "unknown"),
		});
		const shown = target.length > NOTIFY_TARGET_LIMIT ? `${target.slice(0, NOTIFY_TARGET_LIMIT - 1)}…` : target;
		notify(ctx, `pi-scope blocked ${tool} (${kind}) → ${shown}`, "warning");
		if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, `pi-scope: ${state.blocks} blocked`);
		return { block: true, reason };
	};

	pi.on("session_start", async (_event, ctx) => {
		if (disabled) {
			notify(ctx, "pi-scope: disabled by PI_SCOPE_DISABLE=1", "info");
			return;
		}
		const notes = await applyRules(ctx);
		if (state.error !== null) {
			notify(ctx, `pi-scope: ${state.error}`, "error");
			return;
		}
		if (state.rules === null) {
			notify(ctx, "pi-scope: no pi-rules.json found, guard inactive", "warning");
			return;
		}
		const insideScope = state.rules.scopeRoots.some((root) => isAllowed(ctx.cwd, [root]));
		const warning = insideScope ? "" : ` (cwd is outside scope: ${ctx.cwd})`;
		const summary = `pi-scope: active${warning}${notes.length > 0 ? ` — ${notes.join("; ")}` : ""}`;
		notify(ctx, summary, insideScope ? "info" : "warning");
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (disabled) return;
		await ensureFresh(ctx);
		if (state.rules === null) return;
		event.systemPromptOptions.sections["search-scope"] = promptSection(state.rules);
	});

	pi.on("tool_call", async (event, ctx) => {
		if (disabled) return undefined;
		const name = event.toolName;
		if (name !== "read" && name !== "grep" && name !== "find" && name !== "ls" && name !== "bash") return undefined;

		await ensureFresh(ctx);
		const rules = state.rules;
		if (rules === null) {
			if (state.error === null) return undefined;
			return deny(ctx, name, "misconfig", "", describe("", "misconfig"));
		}

		const allowedRoots = [...rules.scopeRoots, ...rules.exceptionRoots];
		if (name === "bash") {
			if (!rules.enforceBash) return undefined;
			const escaping = findEscapingPath(event.input.command, allowedRoots);
			return escaping === undefined ? undefined : deny(ctx, name, "bash", escaping, describe(escaping, "bash"));
		}

		const target = resolveTarget(event.input.path, ctx.cwd);
		if (!isAllowed(target, allowedRoots)) {
			return deny(ctx, name, "scope", target, describe(target, "scope"));
		}
		if (name === "read") return undefined;
		if (matchesIgnoreFolder(target, rules.ignoreFolders) || matchesIgnorePath(target, rules.ignorePaths)) {
			return deny(ctx, name, "ignore", target, describe(target, "ignore"));
		}
		return undefined;
	});

	pi.on("session_shutdown", (_event, ctx) => {
		if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, undefined);
	});

	pi.registerCommand("pi-scope", {
		description: "Show the guard state; 'blocks [n]' lists recent blocked calls, 'reload' re-reads the rules",
		handler: async (args, ctx) => {
			if (args.trim() === "reload") {
				disabled = false;
				state.configPath = undefined;
				state.mtime = undefined;
				const notes = await applyRules(ctx);
				notify(ctx, `pi-scope: reloaded${notes.length > 0 ? ` — ${notes.join("; ")}` : ""}`, state.error ? "error" : "info");
				return;
			}
			const arg = args.trim();
			if (arg === "blocks" || arg.startsWith("blocks ")) {
				const requested = Number(arg.split(/\s+/)[1]);
				const limit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 10;
				const events = await readRecentBlocks(limit);
				if (events.length === 0) {
					notify(ctx, "pi-scope: no blocks recorded", "info");
					return;
				}
				if (ctx.hasUI) {
					const lines = [`last ${events.length} blocked calls:`, ...events.map(formatBlockEvent)];
					ctx.ui.notify(lines.join("\n"), "warning");
				}
				return;
			}
			const rules = state.rules;
			if (disabled) {
				notify(ctx, "pi-scope: disabled by PI_SCOPE_DISABLE=1", "info");
				return;
			}
			if (state.error !== null) {
				notify(ctx, `pi-scope: ${state.error}`, "error");
				return;
			}
			if (rules === null) {
				notify(ctx, "pi-scope: no pi-rules.json found, guard inactive", "warning");
				return;
			}
			notify(ctx, statusReport(rules, state.blocks, blockLogPath(), state.lsRegistered).join("\n"), "info");
		},
	});
}
