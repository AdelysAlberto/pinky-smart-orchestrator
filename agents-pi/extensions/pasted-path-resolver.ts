/**
 * Pasted Path Resolver Extension
 *
 * macOS writes clipboard-media filenames with U+202F (NARROW NO-BREAK SPACE)
 * before "AM"/"PM"; the pasted message carries U+0020 instead, so the exact path
 * is ENOENT.
 *
 * Rewriting the tool path to the real name is not enough. Pi canonicalizes
 * Unicode spaces on every tool path — `core/tools/path-utils.js` calls
 * `resolvePath(filePath, cwd, {normalizeUnicodeSpaces: true})` — so a corrected
 * name is turned back into the U+0020 form before the file is opened, and the
 * read fails again.
 *
 * The durable fix is to stop depending on the original name: when the resolved
 * basename is not plain printable ASCII, the file is copied into a temp
 * directory under an ASCII name and the call is pointed at the copy.
 *
 * On a `read` call whose path does not exist, the directory is listed and the
 * basename is compared with every whitespace run collapsed to a single space.
 * A unique match is used; zero or several matches leave the path intact so the
 * tool reports its own, honest error.
 */

import {copyFileSync, existsSync, mkdirSync, readdirSync, statSync} from "node:fs";
import {tmpdir} from "node:os";
import {basename, dirname, extname, join} from "node:path";

import type {ExtensionAPI} from "@earendil-works/pi-coding-agent";

const ROOT_PREFIX = "/private";
const COPY_DIR = join(tmpdir(), "pi-pasted");
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
const UNSAFE_CHARS = /[^A-Za-z0-9._-]+/g;
const MAX_SLUG = 40;

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

/** True when Pi's Unicode-space normalization would corrupt this basename. */
const needsAsciiAlias = (path: string): boolean => !PRINTABLE_ASCII.test(basename(path));

/** FNV-1a: short, stable, no dependency; keeps aliases apart across directories. */
const hash = (text: string): string => {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, "0");
};

const asciiName = (path: string): string => {
  const extension = extname(path).replace(UNSAFE_CHARS, "").slice(0, 10);
  const stem = basename(path, extname(path)).replace(UNSAFE_CHARS, "-").replace(/^-+|-+$/g, "");
  const slug = stem.slice(0, MAX_SLUG) || "pasted";
  return `${slug}-${hash(path)}${extension}`;
};

/**
 * Copies the file to an ASCII-named path and returns it. Returns null when the
 * copy cannot be made, so the caller can fall back to the resolved path and let
 * the tool report the real error.
 */
export const aliasAsciiPath = (path: string): string | null => {
  try {
    mkdirSync(COPY_DIR, {recursive: true});
    const target = join(COPY_DIR, asciiName(path));
    const source = statSync(path);
    const existing = exists(target) ? statSync(target) : null;
    if (existing === null || existing.size !== source.size || existing.mtimeMs < source.mtimeMs) {
      copyFileSync(path, target);
    }
    return target;
  } catch {
    return null;
  }
};

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async event => {
    if (event.toolName !== "read") return undefined;
    const path = event.input.path;
    if (typeof path !== "string" || path.length === 0) return undefined;

    const resolved = resolvePastedPath(path);
    if (resolved === null) return undefined;

    if (!needsAsciiAlias(resolved)) {
      if (resolved !== path) event.input.path = resolved;
      return undefined;
    }

    const alias = aliasAsciiPath(resolved);
    if (alias !== null) event.input.path = alias;
    return undefined;
  });
}
