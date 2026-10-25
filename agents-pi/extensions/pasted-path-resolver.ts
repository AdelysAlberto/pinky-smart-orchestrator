/**
 * Pasted Path Resolver Extension
 *
 * Fixes reads of pasted-media paths whose filename contains Unicode spaces that
 * the transport normalized away (macOS writes "11:22 PM" with U+202F NARROW
 * NO-BREAK SPACE; the message arrives with U+0020, so the exact path is ENOENT).
 *
 * On a `read` call whose path does not exist, the directory is listed and the
 * basename is compared with every whitespace run collapsed to a single space.
 * A unique match rewrites `input.path`; zero or several matches leave it intact
 * so the tool reports its own, honest error.
 */

import {readdirSync, statSync} from "node:fs";
import {basename, dirname, join} from "node:path";

import type {ExtensionAPI} from "@earendil-works/pi-coding-agent";

const exists = (path: string): boolean => {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
};

/** Collapses every whitespace run (spaces, U+202F, U+00A0, tabs) into one space. */
const normalizeName = (name: string): string => name.normalize("NFC").replace(/\s+/g, " ").trim();

const ROOT_PREFIX = "/private";

/** macOS exposes /var and /tmp through symlinks; the real root is /private/var, /private/tmp. */
const alternateRoots = (path: string): string[] => {
  if (path.startsWith(`${ROOT_PREFIX}/`)) return [path.slice(ROOT_PREFIX.length)];
  if (/^\/(var|tmp)\//.test(path)) return [`${ROOT_PREFIX}${path}`];
  return [];
};

/**
 * Returns the single existing file in the path's directory whose basename
 * matches after whitespace normalization, or null when the match is not unique.
 */
export const resolvePastedPath = (path: string): string | null => {
  const candidates = [path, ...alternateRoots(path)];
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    const directory = dirname(candidate);
    if (!exists(directory)) continue;

    const wanted = normalizeName(basename(candidate));
    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      continue;
    }

    const matches = entries.filter(entry => normalizeName(entry) === wanted);
    if (matches.length === 1) return join(directory, matches[0]);
  }

  return null;
};

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async event => {
    if (event.toolName !== "read") return undefined;
    const path = event.input.path;
    if (typeof path !== "string" || path.length === 0) return undefined;

    const resolved = resolvePastedPath(path);
    if (resolved && resolved !== path) {
      event.input.path = resolved;
    }
    return undefined;
  });
}
