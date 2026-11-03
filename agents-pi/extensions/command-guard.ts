/**
 * Command guard.
 *
 * `bash-watchdog` gives every call a deadline, but its blanket default is 30 minutes: long enough that
 * a command that cannot finish looks identical to a hung one. This extension narrows the deadline by
 * command class and refuses the three shapes that hang by construction, so a stuck call always ends in
 * seconds or minutes, never in silence.
 *
 * Two behaviors, both on `tool_call` for `bash`:
 *
 * 1. Deadline by class. Never raises a smaller deadline the model already set. Chrome headless,
 *    network waits and containers get tight caps; unknown commands get a 15-minute ceiling. The
 *    applied cap is printed, so it is never invisible.
 * 2. Refusal with a recipe. A dev server in the foreground, `timeout` (absent on macOS) and a
 *    network call without a deadline are blocked with the exact replacement to use.
 *
 * Configuration (environment variables):
 *   PI_COMMAND_GUARD_OFF=1   disables every rule
 *   PI_COMMAND_GUARD_VERBOSE=1  also notifies when a cap tightens an existing deadline
 *
 * Commands:
 *   /command-guard   Show the active caps.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

interface Cap {
	readonly binary: RegExp;
	/** Argumentos del mismo segmento que confirman la clase (p. ej. `install` de un gestor). */
	readonly args?: RegExp;
	readonly seconds: number;
	readonly why: string;
}

/**
 * Techos por clase de comando, decididos por el **binario** del segmento y no por el texto completo:
 * una receta entrecomillada que mencione un binario vigilado no debe acortar el deadline de otra cosa.
 */
const CAPS: readonly Cap[] = [
	{
		binary: /(chrome|chromium)/i,
		args: /--headless|--screenshot|--dump-dom|--remote-debugging-port/,
		seconds: 60,
		why: "un navegador headless puede quedarse esperando una navegación a un esquema externo",
	},
	{ binary: /^(puppeteer|playwright)$/, seconds: 60, why: "automatización de navegador" },
	{ binary: /^(ssh|scp|sftp|rsync)$/, seconds: 90, why: "espera de red remota" },
	{ binary: /^git$/, args: /\s(push|fetch|pull|clone|remote)\b/, seconds: 120, why: "red contra el forge" },
	{ binary: /^(curl|wget)$/, seconds: 60, why: "petición HTTP" },
	{ binary: /^(docker|docker-compose|podman|kubectl)$/, seconds: 180, why: "motor de contenedores" },
	{ binary: /^(bun|npm|pnpm|yarn|npx)$/, args: /\s(install|add|i)\b/, seconds: 300, why: "resolución de dependencias" },
	{ binary: /^(xcodebuild|gradle|fastlane|eas)$/, seconds: 900, why: "compilación nativa" },
	{ binary: /^(astro|vite|next|expo|wrangler|nodemon)$/, seconds: 300, why: "herramienta con modo servidor" },
];

const FALLBACK_CAP_SECONDS = 900;

interface Refusal {
	/** Se prueba contra cada segmento **en posición de comando**, nunca contra el texto entrecomillado. */
	readonly lead: RegExp;
	readonly reason: string;
}

/**
 * Segmentos en posición de comando: corta por separadores de shell y limpia prefijos (`(`, `{`,
 * `sudo`, asignaciones `VAR=…`). Sin esto, un texto que mencione un binario vigilado (una receta, un
 * mensaje de commit, un documento) bloqueaba el comando entero.
 */
const commandSegments = (command: string): readonly string[] =>
	command
		.split(/(?:\|\||&&|[;|\n]|\$\()/)
		.map((segment) =>
			segment
				.trim()
				.replace(/^[({\s]+/, "")
				.replace(/^(?:sudo\s+|[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "")
				.trim(),
		)
		.filter((segment) => segment.length > 0);

/** A background marker makes a server command safe: it returns immediately. */
const isBackground = (command: string): boolean =>
	/(^|[^&])&([^&]|$)/.test(command) || /\b(nohup|setsid|disown)\b/.test(command);

const REFUSALS: readonly Refusal[] = [
	{
		lead: /^(astro|vite|next|expo|wrangler|nodemon)\s+(dev|start|preview)\b|^(bun|npm|pnpm|yarn)\s+run\s+dev\b/,
		reason:
			"Un servidor de desarrollo en primer plano no termina nunca. Lánzalo en segundo plano con PID:\n" +
			"  (bun run dev > /tmp/dev.log 2>&1 & echo $! > /tmp/dev.pid) ; sleep 8 ; curl -s -m 3 -o /dev/null -w '%{http_code}' http://localhost:PORT\n" +
			"y ciérralo con: kill $(cat /tmp/dev.pid)",
	},
	{
		lead: /^timeout\s+\d/,
		reason:
			"macOS no trae el binario `timeout` (falla con 'command not found'). Usa el parámetro `timeout` de la herramienta bash, o `perl -e 'alarm N; exec @ARGV' -- cmd`.",
	},
];

const readFlag = (name: string): boolean => {
	const raw = process.env[name];
	return raw !== undefined && raw.trim() !== "" && raw.trim() !== "0";
};

const secondsOf = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;

/** Primer token del segmento: el binario que se ejecuta de verdad. */
const binaryOf = (segment: string): string => segment.split(/\s+/)[0] ?? "";

/**
 * Parte del segmento antes de la primera bandera. Necesaria porque un binario puede ser una ruta con
 * espacios (`/Applications/Google Chrome.app/…/Google Chrome --headless`).
 */
const leadingCommand = (segment: string): string => {
	const tokens = segment.split(/\s+/);
	const firstFlag = tokens.findIndex((token) => token.startsWith("-"));
	return (firstFlag === -1 ? tokens : tokens.slice(0, firstFlag)).join(" ");
};

const capForSegments = (segments: readonly string[]): Cap | undefined => {
	const matching = segments
		.flatMap((segment) => {
			const leading = leadingCommand(segment);
			const binary = binaryOf(segment);
			return CAPS.filter(
				(cap) =>
					(cap.binary.test(leading) || cap.binary.test(binary)) &&
					(cap.args === undefined || cap.args.test(segment)),
			);
		})
		.sort((left, right) => left.seconds - right.seconds);
	return matching[0];
};

export default function (pi: ExtensionAPI) {
	const disabled = readFlag("PI_COMMAND_GUARD_OFF");
	const verbose = readFlag("PI_COMMAND_GUARD_VERBOSE");

	pi.registerCommand("command-guard", {
		description: "Show the command guard deadlines and refusals",
		handler: async (_args, ctx: ExtensionContext) => {
			const caps = CAPS.map((cap) => `  ${cap.seconds}s — ${cap.why}`).join("\n");
			ctx.ui.notify(
				`Command guard ${disabled ? "(off)" : "(on)"}\nBy class:\n${caps}\nFallback: ${FALLBACK_CAP_SECONDS}s\nRefused: foreground dev servers, \`timeout\``,
				"info",
			);
		},
	});

	pi.on("tool_call", async (event, ctx) => {
		if (disabled || event.toolName !== "bash") return undefined;

		const input = event.input as { command?: unknown; timeout?: unknown };
		const command = typeof input.command === "string" ? input.command : "";
		if (command.trim() === "") return undefined;

		const segments = commandSegments(command);

		for (const refusal of REFUSALS) {
			if (isBackground(command)) continue;
			if (!segments.some((segment) => refusal.lead.test(segment))) continue;
			return { block: true, reason: `command-guard: ${refusal.reason}` };
		}

		// Sin deadline, una petición a un host que no responde bloquea la sesión.
		const networkSegment = segments.find((segment) => /^(curl|wget)\b/.test(segment));
		if (networkSegment !== undefined && !/(-m|--max-time|--connect-timeout|--timeout|-T)\s*\d/.test(networkSegment)) {
			return {
				block: true,
				reason:
					"command-guard: toda llamada de red necesita deadline. Añade `-m 15` (curl) o `-T 15` (wget); sin eso un host que no responde bloquea la sesión.",
			};
		}

		const cap = capForSegments(segments);
		const ceiling = cap?.seconds ?? FALLBACK_CAP_SECONDS;
		const current = secondsOf(input.timeout);

		if (current !== undefined && current <= ceiling) return undefined;

		input.timeout = ceiling;
		if (verbose && current !== undefined) {
			ctx.ui.notify(
				`command-guard: ${current}s → ${ceiling}s (${cap?.why ?? "techo por defecto"})`,
				"info",
			);
		}
		return undefined;
	});
}
