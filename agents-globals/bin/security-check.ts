#!/usr/bin/env bun
/**
 * Security gate: scans changed files for patterns that have already shipped a real defect.
 * Policy: `~/.agents/policies/security.rules.md` (S3, S6, S7).
 *
 * Usage:
 *   bun ~/.agents/bin/security-check.ts            # staged diff
 *   bun ~/.agents/bin/security-check.ts --all      # staged + unstaged tracked files
 *   bun ~/.agents/bin/security-check.ts <paths...> # explicit files
 *
 * Exit 1 on any finding. A confirmed false positive is suppressed with
 * `security-check: allow <reason>`, either on the matching line or on the line immediately above it;
 * the reason is required and stays in the diff.
 */

import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

interface Rule {
  readonly id: string;
  readonly policy: string;
  readonly message: string;
  /** File extensions the rule applies to. */
  readonly extensions: readonly string[];
  readonly pattern: RegExp;
}

/**
 * Deliberately high-precision rules only. A checker that cries wolf gets ignored, and then it is
 * worse than no checker: every entry here maps to a defect that already reached production.
 */
const RULES: readonly Rule[] = [
  {
    id: "XSS_SINK",
    policy: "S6",
    message: "dangerouslySetInnerHTML or innerHTML with dynamic data. Sanitize with a vetted sanitizer or render text.",
    extensions: [".tsx", ".jsx", ".ts", ".js", ".astro", ".html"],
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
  },
  {
    id: "CREDENTIAL_IN_URL",
    policy: "S3",
    message: "Credential-looking query parameter inside a URL string leaks to logs, analytics, caches and Referer.",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".astro", ".html"],
    pattern: /(?:https?:\/\/|\/)[^\s"'`]*[?&](?:token|resetToken|reset_token|access_token|refresh_token)=/i,
  },
  {
    id: "SECRET_IN_LOG",
    policy: "S7",
    message: "Logging a credential. Log the fact, never the value.",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".go", ".py", ".rs"],
    pattern: /(?:console\.\w+|logger\.\w+)\s*\([^)]*\b(?:password|passwordHash|accessToken|refreshToken|resetToken|identityToken|apiKey|secret)\b/i,
  },
  {
    id: "HASH_IN_RESPONSE",
    policy: "S7",
    message: "Password hash in an HTTP response. Project an explicit public DTO.",
    extensions: [".ts", ".tsx", ".js"],
    pattern: /(?:res|reply|response)\.\w+\(\s*\{[^}]*\bpasswordHash\b/,
  },
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".astro",
  ".html",
  ".css",
  ".json",
  ".md",
  ".go",
  ".py",
  ".rs",
  ".yml",
  ".yaml",
]);

const ALLOW = "security-check: allow";

const git = (args: readonly string[]): string => {
  try {
    return execFileSync("git", args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024});
  } catch {
    return "";
  }
};

const listLines = (output: string): string[] =>
  output
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

const changedFiles = (mode: "staged" | "all" | "explicit", explicit: readonly string[]): string[] => {
  if (mode === "explicit") return [...explicit];
  const staged = listLines(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]));
  const unstaged = mode === "all" ? listLines(git(["diff", "--name-only", "--diff-filter=ACMR"])) : [];
  return [...new Set([...staged, ...unstaged])];
};

const extensionOf = (file: string): string => {
  const dot = file.lastIndexOf(".");
  return dot === -1 ? "" : file.slice(dot).toLowerCase();
};

interface Finding {
  readonly rule: Rule;
  readonly file: string;
  readonly line: number;
  readonly excerpt: string;
}

const scanFile = (file: string): Finding[] => {
  if (!TEXT_EXTENSIONS.has(extensionOf(file))) return [];

  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return [];
  }

  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (const rule of RULES) {
    if (!rule.extensions.includes(extensionOf(file))) continue;

    lines.forEach((line, index) => {
      if (!rule.pattern.test(line)) return;
      if (line.includes(ALLOW) || lines[index - 1]?.includes(ALLOW)) return;
      findings.push({rule, file, line: index + 1, excerpt: line.trim().slice(0, 160)});
    });
  }

  return findings;
};

const args = process.argv.slice(2);
const explicit = args.filter(arg => !arg.startsWith("--"));
const mode = explicit.length > 0 ? "explicit" : args.includes("--all") ? "all" : "staged";

const files = changedFiles(mode, explicit);
const findings = files.flatMap(scanFile);

if (findings.length === 0) {
  console.log(`security-check: PASS (${files.length} file(s), mode ${mode})`);
  process.exit(0);
}

console.error(`security-check: FAIL (${findings.length} finding(s) in ${files.length} file(s), mode ${mode})\n`);
for (const finding of findings) {
  console.error(`  [${finding.rule.id} · ${finding.rule.policy}] ${finding.file}:${finding.line}`);
  console.error(`    ${finding.rule.message}`);
  console.error(`    > ${finding.excerpt}\n`);
}
console.error("Policy: ~/.agents/policies/security.rules.md");
process.exit(1);
