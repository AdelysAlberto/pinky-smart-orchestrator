/**
 * Compact tool boxes.
 *
 * Replaces the boxed renderer shell of long-output tools (bash, read, grep,
 * ..., and every MCP tool) with a self-rendered compact shell:
 *
 * - Collapsed: exactly 2 rows per tool call. The command row is the first row of
 *   the native call layout, so multi-row calls (a diff preview, JSON arguments)
 *   collapse to the command alone. The result row is the last non-empty output
 *   line, cut with an ellipsis instead of word-wrapped, plus an inline
 *   "+N lines · ctrl+o" counter.
 * - Expanded (ctrl+o or click): the native renderer at the real terminal width.
 *   Native wrapping and layout are preserved; the command and every output row
 *   share the tool's background. Wrapping is the native renderer's decision.
 * - Spacing: the default shell adds Spacer(1) plus Box(paddingY=1), so 2 blank
 *   rows above the box and 1 below. The self shell keeps the separator rows the
 *   host renders and drops the box padding.
 * - `outputPad` is applied here, as the contract requires for `renderShell: "self"`.
 *
 * The native renderer owns its own component: built-in renderers mutate the
 * component they returned through `context.lastComponent`. This wrapper keeps
 * that component in renderer state and hands it back to the native renderer, so
 * the wrapper itself is never visible to it.
 *
 * Auto-loaded from ~/.pi/agent/extensions/. No configuration.
 */
import type { ExtensionAPI, Theme, ToolRenderers } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth, visibleWidth, Text, type Component } from "@earendil-works/pi-tui";

const COLLAPSED_LINES = 1;
/** Canvas width used to measure a single-row slot. Bounded: core pads every measured row to the render width. */
const MEASURE_WIDTH = 4000;
type BgKey = "toolPendingBg" | "toolSuccessBg" | "toolErrorBg";

const AFFECTED_TOOLS = new Set([
	"bash",
	"powershell",
	"read",
	"write",
	"edit",
	"grep",
	"find",
	"ls",
	"codemode",
]);

function isAffected(toolName: string): boolean {
	return AFFECTED_TOOLS.has(toolName) || toolName.startsWith("mcp__");
}

/** `outputPad` comes from the host and defaults to 1; an unusable value must not reach `" ".repeat`. */
function padOf(outputPad: number | undefined): number {
	const pad = Math.floor(outputPad ?? 1);
	return Number.isFinite(pad) && pad > 0 ? pad : 0;
}

interface ContentBlock {
	type: string;
	text?: string;
}

interface CompactState {
	callInner?: Component;
	resultInner?: Component;
}

function extractText(content: ContentBlock[] | undefined): string {
	return (content ?? [])
		.filter((c) => c.type === "text" && typeof c.text === "string")
		.map((c) => c.text as string)
		.join("\n")
		.replace(/\r/g, "")
		.trimEnd();
}

/** Trailing escape sequences a background or color wrapper appends after the content. */
const TRAILING_ESCAPES = /(?:\x1b\[[0-9;]*m)+$/;

/**
 * Drop the trailing padding a width-sized render appends. Without this every
 * rendered row is exactly as wide as the render width, so the clamp below would
 * always report an overflow and append an ellipsis to short rows too. A wrapped
 * row keeps that padding before its closing escape sequences, so strip there and
 * leave the reset in place: removing it would leak the color into the next row.
 */
function stripPadding(line: string): string {
	const tail = line.match(TRAILING_ESCAPES)?.[0] ?? "";
	const body = tail ? line.slice(0, -tail.length) : line;
	return body.replace(/[ \t]+$/, "") + tail;
}

/**
 * A row with nothing to show. Blank rows carry the tool background and padding, so they
 * must be tested after the escape sequences are gone.
 */
function isBlankRow(line: string): boolean {
	return stripTerminalSequences(line).trim() === "";
}

/** Theme calls throw on a token the active theme does not define; a row must still render. */
function safeFg(theme: Theme, color: Parameters<Theme["fg"]>[0], text: string): string {
	try {
		return theme.fg(color, text);
	} catch {
		return text;
	}
}

function safeBg(theme: Theme, bgKey: BgKey, text: string): string {
	try {
		return theme.bg(bgKey, text);
	} catch {
		return text;
	}
}

/** Keep the content readable when a caller passes a pad wider than the terminal. */
function effectivePad(pad: number, width: number): number {
	return Math.min(pad, Math.max(0, Math.floor((width - 1) / 2)));
}

/** One painted row: horizontal pad, background filled, content clamped to one terminal row. */
function paintRow(theme: Theme, bgKey: BgKey, line: string, width: number, pad: number): string {
	const margin = effectivePad(pad, width);
	const inner = Math.max(1, width - margin * 2);
	const body = truncateToWidth(stripPadding(line), inner, "\u2026", true);
	const spaces = " ".repeat(margin);
	return `${spaces}${safeBg(theme, bgKey, body)}${spaces}`;
}

interface ShellOptions {
	/** `"all"` keeps the native layout, blank rows included; a number keeps that many leading rows once blanks are dropped. */
	rows: "all" | number;
	/**
	 * Measure the inner component on a wide canvas instead of the terminal width. A wrapped
	 * call renders one visual row per wrapped fragment, so the fragment kept for a long
	 * command is the first slice of the line, not the line itself.
	 */
	wide?: boolean;
}

/**
 * Wraps a native renderer component and keeps its layout, painting the tool
 * background on every row. Caches its rows per width, because the transcript
 * re-renders every tool result on every frame.
 *
 * The TUI render loop has no error boundary, so anything thrown here exits Pi.
 * A throwing inner component and a missing theme token both degrade to one row.
 */
class ShellComponent implements Component {
	private cachedKey: string | undefined;
	private cachedLines: string[] | undefined;

	constructor(
		private inner: Component,
		private theme: Theme,
		private bgKey: BgKey,
		private pad: number,
		private options: ShellOptions,
		private label: string,
	) {}

	render(width: number): string[] {
		const { rows: rowLimit, wide } = this.options;
		const key = `${width}:${this.pad}:${this.bgKey}:${rowLimit}:${wide === true}`;
		if (this.cachedLines !== undefined && this.cachedKey === key) {
			return this.cachedLines;
		}
		const contentWidth = wide === true ? MEASURE_WIDTH : Math.max(1, width - effectivePad(this.pad, width) * 2);
		let rendered: string[];
		try {
			rendered = this.inner.render(contentWidth);
		} catch {
			this.cachedKey = key;
			this.cachedLines = this.degradedRows(width);
			return this.cachedLines;
		}
		const kept = rowLimit === "all" ? rendered : rendered.filter((line) => !isBlankRow(line)).slice(0, rowLimit);
		const rows = kept.map((line) => paintRow(this.theme, this.bgKey, line, width, this.pad));
		this.cachedKey = key;
		this.cachedLines = rows;
		return rows;
	}

	invalidate(): void {
		this.cachedKey = undefined;
		this.cachedLines = undefined;
		try {
			this.inner.invalidate();
		} catch {
			// Ignore: the wrapper must not be a path for a failing renderer to reach the TUI.
		}
	}

	/** Last resort for a component that cannot render: its name on one row. */
	private degradedRows(width: number): string[] {
		try {
			return [paintRow(this.theme, this.bgKey, this.label, width, this.pad)];
		} catch {
			return [];
		}
	}
}

/** Collapsed result box: the last N non-empty output rows, one terminal row each. */
class CompactResult implements Component {
	constructor(
		private text: string,
		private theme: Theme,
		private bgKey: BgKey,
		private pad: number,
	) {}

	render(width: number): string[] {
		const lines = this.text
			.split("\n")
			.map((line) => line.trimEnd())
			.filter((line) => line !== "");
		if (lines.length === 0) {
			return [];
		}
		const visible = lines.slice(-COLLAPSED_LINES);
		const hidden = lines.length - visible.length;
		const margin = effectivePad(this.pad, width);
		const inner = Math.max(1, width - margin * 2);
		const suffix = hidden > 0 ? safeFg(this.theme, "muted", `  \u00b7 +${hidden} l\u00edneas \u00b7 ctrl+o`) : "";
		const reserve = suffix ? visibleWidth(suffix) + 1 : 0;
		const spaces = " ".repeat(margin);
		const out: string[] = [];
		for (const line of visible) {
			const body = reserve > 0 ? truncateToWidth(line, Math.max(1, inner - reserve), "\u2026") : line;
			const row = truncateToWidth(safeFg(this.theme, "toolOutput", body) + suffix, inner, "", true);
			out.push(`${spaces}${safeBg(this.theme, this.bgKey, row)}${spaces}`);
		}
		return out;
	}

	invalidate(): void {
		// Stateless render.
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerToolRenderer((toolName, next): ToolRenderers | undefined => {
		if (!isAffected(toolName)) {
			return undefined;
		}
		const base = next();

		return {
			renderShell: "self",
			renderCall(args, theme, context) {
				const bgKey: BgKey = context.isPartial ? "toolPendingBg" : context.isError ? "toolErrorBg" : "toolSuccessBg";
				const state = context.state as CompactState;
				// The native renderer mutates the component it created: it must receive that one as lastComponent.
				const nativeContext = { ...context, lastComponent: state.callInner };
				const inner =
					base?.renderCall?.(args, theme, nativeContext) ?? new Text(safeFg(theme, "toolTitle", theme.bold(toolName)), 0, 0);
				state.callInner = inner;
				// Collapsed: the command only, whatever the native call layout adds below it (a diff preview, JSON arguments).
				return new ShellComponent(inner, theme, bgKey, padOf(context.outputPad), { rows: context.expanded ? "all" : 1, wide: !context.expanded }, toolName);
			},
			renderResult(result, options, theme, context) {
				const bgKey: BgKey =
					options.isPartial || context.isPartial ? "toolPendingBg" : context.isError ? "toolErrorBg" : "toolSuccessBg";
				const state = context.state as CompactState;
				const pad = padOf(context.outputPad);
				if (options.expanded && base?.renderResult) {
					const nativeContext = { ...context, lastComponent: state.resultInner };
					const inner = base.renderResult(result, options, theme, nativeContext);
					state.resultInner = inner;
					return new ShellComponent(inner, theme, bgKey, pad, { rows: "all" }, toolName);
				}
				const text = extractText(result.content as ContentBlock[] | undefined);
				if (options.expanded) {
					// No native renderer available: one row per logical line.
					const lines = text
						.split("\n")
						.map((line) => safeFg(theme, "toolOutput", line))
						.join("\n");
					return new ShellComponent(new Text(lines, 0, 0), theme, bgKey, pad, { rows: "all" }, toolName);
				}
				return new CompactResult(text, theme, bgKey, pad);
			},
		};
	});
}
