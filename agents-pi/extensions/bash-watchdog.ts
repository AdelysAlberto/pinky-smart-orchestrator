/**
 * Bash watchdog.
 *
 * Pi shows `Working...` while a `bash` call runs, but that row says nothing
 * about what is running or for how long. A build of four minutes and a hung
 * command look identical. This extension closes that gap with two behaviors:
 *
 * 1. Deadline. A `bash` call the model sends without `timeout` gets a default
 *    one, so a hung command aborts instead of running forever. The injected
 *    deadline is printed in the status row, so it is never invisible.
 * 2. Visibility. While a `bash` call runs, the footer status and the working
 *    row show elapsed time, the deadline, and the command. Heartbeats mark the
 *    milestones on a fixed ladder (1m, 5m, 15m, 30m, 1h, then hourly), so a
 *    long command never looks indistinguishable from a dead one.
 *
 * Configuration (environment variables):
 *   PI_BASH_WATCHDOG_TIMEOUT  default deadline in seconds, 0 disables
 *                             the injection entirely (default: 1800)
 *
 * Commands:
 *   /bash-watchdog  Show configuration and the currently running command.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const DEFAULT_DEADLINE_SECONDS = 1800;
const HEARTBEAT_LADDER_SECONDS = [60, 300, 900, 1800, 3600];
const HEARTBEAT_REPEAT_SECONDS = 3600;
const TICK_MS = 1000;
const STATUS_KEY = "bash-watchdog";
const COMMAND_LIMIT = 64;
const SLOW_COMPLETION_SECONDS = 60;

const readEnvSeconds = (name: string, fallback: number): number => {
	const raw = process.env[name];
	if (raw === undefined || raw.trim() === "") return fallback;
	const value = Number(raw);
	return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
};

const formatDuration = (seconds: number): string => {
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rest = total % 60;
	if (hours > 0) return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
	if (minutes > 0) return rest > 0 ? `${minutes}m${rest}s` : `${minutes}m`;
	return `${rest}s`;
};

const excerpt = (text: string, limit: number): string =>
	text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;

const commandLabel = (command: string): string => {
	const first = command.split("\n").find((line) => line.trim() !== "") ?? "";
	return excerpt(first.trim(), COMMAND_LIMIT);
};

/** The next milestone the heartbeat ladder crosses, or undefined. */
const nextHeartbeatAt = (elapsedSeconds: number, lastHeartbeat: number): number | undefined => {
	const upcoming = HEARTBEAT_LADDER_SECONDS.find(
		(milestone) => milestone > lastHeartbeat && elapsedSeconds >= milestone,
	);
	if (upcoming !== undefined) return upcoming;
	if (elapsedSeconds >= lastHeartbeat + HEARTBEAT_REPEAT_SECONDS) {
		return lastHeartbeat + HEARTBEAT_REPEAT_SECONDS;
	}
	return undefined;
};

interface RunningBash {
	toolCallId: string;
	command: string;
	startedAt: number;
	deadlineSeconds: number | undefined;
	lastHeartbeat: number;
}

export default function (pi: ExtensionAPI) {
	const configuredDeadline = readEnvSeconds("PI_BASH_WATCHDOG_TIMEOUT", DEFAULT_DEADLINE_SECONDS);
	let running: RunningBash | undefined;
	let ticker: ReturnType<typeof setInterval> | undefined;
	let statusContext: ExtensionContext | undefined;

	const stop = (): void => {
		if (ticker !== undefined) clearInterval(ticker);
		ticker = undefined;
		running = undefined;
		const ctx = statusContext;
		statusContext = undefined;
		if (!ctx) return;
		ctx.ui.setStatus(STATUS_KEY, undefined);
		ctx.ui.setWorkingMessage();
	};

	const renderStatus = (ctx: ExtensionContext, current: RunningBash): void => {
		const elapsed = (Date.now() - current.startedAt) / 1000;
		const theme = ctx.ui.theme;
		const deadline =
			current.deadlineSeconds === undefined ? "" : theme.fg("dim", `/${formatDuration(current.deadlineSeconds)}`);
		const clock = theme.fg("accent", `⏱ ${formatDuration(elapsed)}`);
		const label = theme.fg("dim", ` ${commandLabel(current.command)}`);
		const text = `${clock}${deadline}${label}`;
		ctx.ui.setStatus(STATUS_KEY, text);
		ctx.ui.setWorkingMessage(text);
	};

	const tick = (ctx: ExtensionContext): void => {
		const current = running;
		if (!current) return;
		const elapsed = (Date.now() - current.startedAt) / 1000;
		renderStatus(ctx, current);
		const milestone = nextHeartbeatAt(elapsed, current.lastHeartbeat);
		if (milestone === undefined) return;
		current.lastHeartbeat = milestone;
		ctx.ui.notify(`bash still running ${formatDuration(milestone)} · ${commandLabel(current.command)}`, "info");
	};

	pi.on("tool_call", async (event) => {
		if (event.toolName !== "bash") return;
		if (configuredDeadline === 0) return;
		const input = event.input as { timeout?: number };
		if (input.timeout === undefined) input.timeout = configuredDeadline;
	});

	pi.on("tool_execution_start", async (event, ctx) => {
		if (event.toolName !== "bash") return;
		stop();
		statusContext = ctx;
		const input = event.args as { command?: string; timeout?: number } | undefined;
		running = {
			toolCallId: event.toolCallId,
			command: input?.command ?? "",
			startedAt: Date.now(),
			deadlineSeconds: input?.timeout,
			lastHeartbeat: 0,
		};
		renderStatus(ctx, running);
		ticker = setInterval(() => tick(ctx), TICK_MS);
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		if (event.toolName !== "bash") return;
		const current = running;
		if (!current || current.toolCallId !== event.toolCallId) return;
		const seconds = (event.durationMs ?? Date.now() - current.startedAt) / 1000;
		const label = commandLabel(current.command);
		stop();
		if (seconds < SLOW_COMPLETION_SECONDS) return;
		const verdict = event.isError ? "failed" : "finished";
		ctx.ui.notify(`bash ${verdict} in ${formatDuration(seconds)} · ${label}`, event.isError ? "warning" : "info");
	});

	pi.on("session_shutdown", async () => {
		stop();
	});

	pi.registerCommand("bash-watchdog", {
		description: "Show the bash watchdog configuration and the running command",
		handler: async (_args, ctx) => {
			const deadline =
				configuredDeadline === 0 ? "disabled" : `${configuredDeadline}s (${formatDuration(configuredDeadline)})`;
			const lines = [`default deadline: ${deadline}`];
			if (running) {
				const elapsed = (Date.now() - running.startedAt) / 1000;
				lines.push(`running ${formatDuration(elapsed)}: ${commandLabel(running.command)}`);
			} else {
				lines.push("no bash command running");
			}
			ctx.ui.notify(lines.join(" · "), "info");
		},
	});
}
