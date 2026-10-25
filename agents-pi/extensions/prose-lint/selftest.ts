/**
 * Self-test for the prose lint patterns.
 *
 * Run with `bun selftest.ts` after editing `patterns.ts`. It asserts that each
 * rule family fires on a real example of the tell, that code spans are masked,
 * and that plain technical prose stays clean — the false-positive side is the
 * one that makes a lint unusable.
 */

import assert from "node:assert/strict";
import { flaggedLineCount, isLintablePath, isSkippedPath, lintProse } from "./index.ts";

const fired = (text: string, rule: number): boolean =>
	lintProse(text).hits.some((hit) => hit.rule === rule);

const clean = (text: string): boolean => lintProse(text).hits.length === 0;

/** Rows collapse per rule and line, so one bad sentence is one repair. */
const dedupedRows = (): number =>
	lintProse("The hub stands as a testament to the era, highlighting its importance.").hits.length;

const cases: readonly { name: string; text: string; rule?: number; expectClean?: boolean }[] = [
	{ name: "rule 1 significance", text: "The station stands as a testament to the era.", rule: 1 },
	{ name: "rule 1 pivotal role", text: "It played a pivotal role in the shift.", rule: 1 },
	{ name: "rule 2 tail participle", text: "Sales grew 12% in 2024, highlighting the demand.", rule: 2 },
	{ name: "rule 3 ad-speak", text: "A vibrant town nestled in the valley.", rule: 3 },
	{ name: "rule 4 copula dodge", text: "The gallery serves as the exhibition space.", rule: 4 },
	{ name: "rule 5 negative parallelism", text: "This is not just a cache but a scheduler.", rule: 5 },
	{ name: "rule 6 heading", text: "## Awards and recognition", rule: 6 },
	{ name: "rule 7 vague attribution", text: "Experts argue that the API is faster.", rule: 7 },
	{ name: "rule 8 meta-talk", text: "Based on available information, the flag is undocumented.", rule: 8 },
	{
		name: "rule 8 em-dash density",
		text: "Retries fixed it — not the cache — and the index — after the rebuild — went cold — again — twice.",
		rule: 8,
	},
	{
		name: "normal em-dash usage stays clean",
		text: `${`The worker drains the queue on shutdown — a slow flush that cost us the first run. `.repeat(1)}${`Latency fell from 840 ms to 210 ms after the index change, and the queue depth stayed at zero for the rest of the hour, which the dashboard shows as a flat line. `.repeat(4)}`,
		expectClean: true,
	},
	{
		name: "code spans are masked",
		text: "Use `boasts` and ```\nconst x = \"a tapestry of robust levers\";\n```\nin the parser.",
		expectClean: true,
	},
	{
		name: "plain technical prose",
		text: "The handler returns Result<T> and retries the request twice. Latency fell from 840 ms to 210 ms after the index change.",
		expectClean: true,
	},
];

let failures = 0;
for (const testCase of cases) {
	const report = lintProse(testCase.text);
	const ok = testCase.expectClean === true ? clean(testCase.text) : fired(testCase.text, testCase.rule ?? 0);
	if (ok) {
		console.log(`ok   ${testCase.name}`);
		continue;
	}
	failures += 1;
	console.log(`FAIL ${testCase.name} -> ${JSON.stringify(report.ruleCounts)}`);
}

assert.equal(failures, 0, `${failures} pattern case(s) failed`);
assert.equal(dedupedRows(), 2, "one row per rule and line: rule 1 + rule 2 on the same sentence");
assert.equal(
	flaggedLineCount(lintProse("A stands as a testament.\nExperts argue B. Not just X but Y.")),
	2,
	"the UI warning counts lines, not rows",
);
assert.equal(isLintablePath("/tmp/notes.md"), true, "markdown is lintable");
assert.equal(isLintablePath("/tmp/main.ts"), false, "code is not linted");
assert.equal(isSkippedPath("/Users/x/.pi/agent/APPEND_SYSTEM.md"), true, "rules file is skipped by default");
assert.equal(isSkippedPath("/repo/artifacts/spec.md"), false, "project docs are linted");
process.env.PI_PROSE_LINT_SKIP = "artifacts";
assert.equal(isSkippedPath("/repo/artifacts/spec.md"), true, "PI_PROSE_LINT_SKIP overrides the default");
assert.equal(isSkippedPath("/repo/AGENTS.md"), false, "override replaces the default, it does not extend it");
console.log("ok   path filters and env override");

console.log(`\n${cases.length} cases passed.`);
