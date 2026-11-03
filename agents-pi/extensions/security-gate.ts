/**
 * Security gate extension.
 *
 * Blocks `git commit` and deploy commands while the session has edited a security surface and has not
 * produced the closing `## Security` block required by `~/.agents/policies/security.rules.md` §1.
 *
 * Why a hook and not a paragraph: the policy already existed and a defect still shipped. What was
 * missing was something that fails instead of something that reminds.
 */

import type {ExtensionAPI} from "@earendil-works/pi-coding-agent";

/** Files whose edit activates the gate. Keep it aligned with the S1–S8 trigger list. */
const SECURITY_SURFACE =
  /(?:^|\/)(?:auth|Auth|Sessions?|Communications)\/|\/(?:reset-password|forgot-password)\.astro$|validationSchemas|middleware\.ts$|(?:upload|media|payment|subscription)[\w/.-]*\.ts$|\/(?:welcome|signup-attempt)[\w.-]*\.ts$/;

/** Commands that publish work. Everything else stays unblocked. */
const PUBLISH_COMMAND = /\bgit\s+(?:commit|push)\b|\bwrangler\s+deploy\b|\bbun\s+run\s+deploy\b|\bmake\s+prod-apply\b|\bpct\s+push\b|\bgh\s+release\b/;

/** The closing artifact. Any heading that starts with "Security" counts. */
const GATE_BLOCK = /^#{2,3}\s*Security\b/m;

interface GateState {
  readonly touched: Set<string>;
  gateSeen: boolean;
}

const textOf = (message: {content?: unknown}): string => {
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map(part => {
      if (typeof part !== "object" || part === null) return "";
      const candidate = part as {type?: string; text?: unknown};
      return candidate.type === "text" && typeof candidate.text === "string" ? candidate.text : "";
    })
    .join("\n");
};

export default function securityGate(pi: ExtensionAPI): void {
  const state: GateState = {touched: new Set<string>(), gateSeen: false};

  const reset = (): void => {
    state.touched.clear();
    state.gateSeen = false;
  };

  pi.on("session_start", async () => {
    reset();
    return undefined;
  });

  pi.on("message_end", async event => {
    if (event.message.role !== "assistant") return undefined;
    if (GATE_BLOCK.test(textOf(event.message))) state.gateSeen = true;
    return undefined;
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "edit" || event.toolName === "write") {
      const path = String((event.input as {path?: unknown}).path ?? "");
      if (SECURITY_SURFACE.test(path)) {
        state.touched.add(path);
        // New work on a security surface invalidates a previous gate: it described the old diff.
        state.gateSeen = false;
      }
      return undefined;
    }

    if (event.toolName !== "bash") return undefined;

    const command = String((event.input as {command?: unknown}).command ?? "");
    if (!PUBLISH_COMMAND.test(command)) return undefined;
    if (state.gateSeen || state.touched.size === 0) return undefined;

    const files = [...state.touched].slice(0, 6).join(", ");
    const reason = [
      "Bloqueado por el Security Gate.",
      `Tocaste una superficie de seguridad (${files}) y esta sesión no ha emitido el bloque ## Security.`,
      "Escribe el bloque S1–S8 de ~/.agents/policies/security.rules.md (PASS con evidencia ejecutada, o N/A con motivo) y repite el comando.",
    ].join(" ");

    if (ctx.hasUI) {
      ctx.ui.notify("Security Gate: falta el bloque ## Security", "warning");
    }

    return {block: true, reason};
  });
}
