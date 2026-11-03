/**
 * Verify gate extension.
 *
 * Blocks the actions that *assert completion* (`todo` → completed, `git commit`, deploy) while the
 * session has edited a file whose default lives somewhere else and nobody has observed the resulting
 * state. The defect it exists for: changing a default in code (`jobs/registry.ts`) and reporting the
 * behaviour as changed, when the effective schedule lived in `cron_scheduler_configs` and had not moved.
 *
 * Why a hook: the rule "evidence before assertion" already existed and the claim still shipped, because
 * the model classified the claim as a fact about the diff. A gate does not classify: it counts edits and
 * commands. Blocks only the three completion actions; everything else stays unblocked.
 *
 * Configuration: `~/.agents/config/verify-gate.json`
 *
 *   {
 *     "mode": "block",                      // "block" (default) | "warn"
 *     "surfaces": [
 *       {
 *         "name": "cron schedules",
 *         "match": ["** /jobs/registry.ts"], // glob-ish: substring or simple `*` glob on the path
 *         "observe": "cron_scheduler_configs", // token that must appear in a bash command after the edit
 *         "hint": "Read the effective row before claiming the schedule changed."
 *       }
 *     ]
 *   }
 *
 * A surface without `observe` is ignored, so a half-written config never blocks work. When the config is
 * missing the gate is a no-op: an absent rule must not brick the session.
 */

import type {ExtensionAPI} from "@earendil-works/pi-coding-agent";
import {readFileSync} from "node:fs";
import {homedir} from "node:os";
import {join} from "node:path";

export interface VerifySurface {
  readonly name: string;
  readonly match: readonly string[];
  readonly observe: string;
  readonly hint?: string;
}

export interface VerifyConfig {
  readonly mode: "block" | "warn";
  readonly surfaces: readonly VerifySurface[];
}

/** Commands that publish or declare work finished. Everything else stays unblocked. */
const COMPLETION_COMMAND =
  /\bgit\s+(?:commit|push)\b|\bwrangler\s+deploy\b|\bbun\s+run\s+deploy\b|\bmake\s+prod-apply\b|\bpct\s+push\b|\bgh\s+release\b|\bdocker\s+compose\s+up\b|\bpm2\s+restart\b|\bsystemctl\s+(?:restart|start|stop)\b/;

/** Sentences that assert an outcome. Used only to annotate the message, never to block it. */
export const COMPLETION_CLAIM =
  /\b(?:ya\s+est[áa]|qued[óo]\s+(?:aplicad|desplegad|list|hech)|pas[óo]\s+de\s|se\s+aplic[óo]|aplicad[oa]\s|desplegad[oa]\s|implementad[oa]\s|verificad[oa]\s|funciona\b|est[áa]\s+(?:aplicado|desplegado|hecho|listo)|it\s+is\s+(?:applied|deployed|live)|has\s+been\s+(?:applied|deployed))/i;

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

const isGlobMatch = (pattern: string, path: string): boolean => {
  if (!pattern.includes("*")) return path.includes(pattern);
  const escaped = pattern
    .split("*")
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}$|${escaped}`).test(path);
};

/** Surfaces whose declared default the session edited. Pure: no I/O. */
export const matchedSurfaces = (config: VerifyConfig, edited: Iterable<string>): readonly VerifySurface[] => {
  const paths = [...edited];
  return config.surfaces.filter(
    surface =>
      surface.observe.trim() !== "" &&
      surface.match.some(pattern => paths.some(path => isGlobMatch(pattern, path)))
  );
};

/**
 * Surfaces still unobserved: the session edited their default and has not run, *after that edit*, any bash
 * command carrying the observation token. Pure: no I/O.
 */
export const unobservedSurfaces = (
  config: VerifyConfig,
  edits: readonly {readonly path: string; readonly seq: number}[],
  commands: readonly {readonly command: string; readonly seq: number}[]
): readonly VerifySurface[] => {
  const editedPaths = edits.map(edit => edit.path);
  return matchedSurfaces(config, editedPaths).filter(surface => {
    const lastMatchingEdit = edits
      .filter(edit => surface.match.some(pattern => isGlobMatch(pattern, edit.path)))
      .reduce((latest, edit) => Math.max(latest, edit.seq), 0);
    return !commands.some(command => command.seq > lastMatchingEdit && command.command.includes(surface.observe));
  });
};

export const configPath = (): string =>
  join(process.env.AGENTS_DIR?.trim() || join(homedir(), ".agents"), "config", "verify-gate.json");

/** Missing or malformed config means "no gate": a broken rule must not block a session. */
export const loadConfig = (path: string = configPath()): VerifyConfig | null => {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<VerifyConfig>;
    if (!Array.isArray(parsed.surfaces)) return null;
    const surfaces = parsed.surfaces.filter(
      (surface): surface is VerifySurface =>
        typeof surface === "object" &&
        surface !== null &&
        typeof (surface as VerifySurface).name === "string" &&
        Array.isArray((surface as VerifySurface).match) &&
        typeof (surface as VerifySurface).observe === "string"
    );
    return {mode: parsed.mode === "warn" ? "warn" : "block", surfaces};
  } catch {
    return null;
  }
};

interface GateState {
  seq: number;
  edits: {path: string; seq: number}[];
  commands: {command: string; seq: number}[];
}

type Notify = (message: string, level: "info" | "warning") => void;

/** `undefined` means "allowed": warn mode only notifies, it never blocks. */
const refuse = (
  config: VerifyConfig,
  pending: readonly VerifySurface[],
  action: string,
  notify?: Notify
): {block: true; reason: string} | undefined => {
  const lines = pending.map(
    surface => `${surface.name}: ${surface.hint ?? `ejecuta un comando con \`${surface.observe}\``}`
  );
  const reason = [
    `Verify gate: no puedes ${action} sin observar el estado efectivo.`,
    ...lines,
    "Editaste el default; el valor que manda vive fuera del código. Ejecuta la comprobación y repite.",
  ].join(" ");

  if (config.mode === "warn") {
    notify?.(`Verify gate (warn): ${pending.map(surface => surface.name).join(", ")}`, "warning");
    return undefined;
  }

  notify?.("Verify gate: falta observar el estado efectivo", "warning");
  return {block: true, reason};
};

export default function verifyGate(pi: ExtensionAPI): void {
  const config = loadConfig();
  if (!config) return;

  const state: GateState = {seq: 0, edits: [], commands: []};

  pi.on("session_start", async () => {
    state.seq = 0;
    state.edits = [];
    state.commands = [];
    return undefined;
  });

  pi.on("tool_call", async (event, ctx) => {
    state.seq += 1;
    const seq = state.seq;
    const notify: Notify | undefined = ctx.hasUI ? (message, level) => ctx.ui.notify(message, level) : undefined;

    if (event.toolName === "edit" || event.toolName === "write") {
      const path = String((event.input as {path?: unknown}).path ?? "");
      if (path !== "") state.edits.push({path, seq});
      return undefined;
    }

    if (event.toolName === "bash") {
      const command = String((event.input as {command?: unknown}).command ?? "");
      if (command !== "") state.commands.push({command, seq});
      if (!COMPLETION_COMMAND.test(command)) return undefined;
      const pending = unobservedSurfaces(config, state.edits, state.commands);
      if (pending.length === 0) return undefined;
      return refuse(config, pending, "ese comando", notify);
    }

    if (event.toolName !== "todo") return undefined;
    const input = event.input as {action?: unknown; status?: unknown};
    if (input.action !== "update" || input.status !== "completed") return undefined;

    const pending = unobservedSurfaces(config, state.edits, state.commands);
    if (pending.length === 0) return undefined;
    return refuse(config, pending, "marcar la tarea como completed", notify);
  });

  // Anotar la respuesta cuando afirma un resultado que esta sesión no ha observado.
  pi.on("message_end", async event => {
    if (event.message.role !== "assistant") return undefined;
    const pending = unobservedSurfaces(config, state.edits, state.commands);
    if (pending.length === 0) return undefined;

    const text = textOf(event.message as {content?: unknown});
    if (!COMPLETION_CLAIM.test(text)) return undefined;

    const footer = [
      "",
      "> verify-gate: esta sesión editó el default de " +
        pending.map(surface => surface.name).join(", ") +
        " y no ha observado el estado efectivo. Lo afirmado arriba no está verificado: " +
        pending.map(surface => surface.hint ?? `falta un comando con ${surface.observe}`).join(" "),
    ].join("\n");

    const content = (event.message as {content?: unknown}).content;
    const nextContent =
      typeof content === "string"
        ? `${content}${footer}`
        : [...(Array.isArray(content) ? content : []), {type: "text", text: footer}];

    return {message: {...event.message, content: nextContent} as typeof event.message};
  });
}

