/**
 * Hook-level self-test for the verify gate.
 *
 * `selftest-verify-gate.ts` covers the pure decision core; this file drives the registered handlers with
 * a fake `ExtensionAPI`, so the blocking path itself is exercised: edit → tests → "completed" must be
 * refused, and the same sequence with the observation command must pass. Run with `bun selftest-verify-gate-hooks.ts`.
 */

import assert from "node:assert/strict";
import verifyGate from "../verify-gate.ts";

type Handler = (event: any, ctx: any) => Promise<any>;

const install = () => {
	const handlers: Record<string, Handler> = {};
	const pi = {
		on: (name: string, handler: Handler) => {
			handlers[name] = handler;
			return () => {};
		},
	};
	verifyGate(pi as any);
	return handlers;
};

const ctx = {hasUI: false};

const handlers = install();
assert.ok(handlers.tool_call, "el gate debe registrar tool_call");
assert.ok(handlers.message_end, "el gate debe registrar message_end");

await handlers.session_start?.({}, ctx);
await handlers.tool_call(
	{toolName: "edit", input: {path: "/repo/backend/src/jobs/registry.ts"}},
	ctx
);

// Running the project's tests is not observing the effective schedule: the claim stays blocked.
const tests = await handlers.tool_call({toolName: "bash", input: {command: "bun run test"}}, ctx);
assert.equal(tests, undefined, "correr tests no debe bloquearse");

const blocked = await handlers.tool_call({toolName: "todo", input: {action: "update", status: "completed"}}, ctx);
assert.equal(blocked?.block, true, "marcar completed sin observar debe bloquearse");
assert.match(String(blocked?.reason), /cron schedules/);

// A commit is refused by the same rule.
const commit = await handlers.tool_call({toolName: "bash", input: {command: 'git commit -m "x"'}}, ctx);
assert.equal(commit?.block, true, "el commit sin observar debe bloquearse");

// Reading the row that holds the effective schedule satisfies the gate.
await handlers.tool_call(
	{toolName: "bash", input: {command: "psql -c 'select key, pattern from cron_scheduler_configs'"}},
	ctx
);
const allowed = await handlers.tool_call({toolName: "todo", input: {action: "update", status: "completed"}}, ctx);
assert.equal(allowed, undefined, "con la observación posterior, completed debe permitirse");

// A later edit invalidates the previous observation and the message gets annotated.
await handlers.tool_call(
	{toolName: "edit", input: {path: "/repo/backend/src/jobs/registry.ts"}},
	ctx
);
const annotated = await handlers.message_end(
	{message: {role: "assistant", content: "El barrido quedó aplicado a diario."}},
	ctx
);
assert.match(JSON.stringify(annotated?.message ?? {}), /verify-gate/, "la respuesta debe anotarse");
assert.match(JSON.stringify(annotated?.message ?? {}), /no está verificado/);

// A user message is never touched.
const untouched = await handlers.message_end({message: {role: "user", content: "El barrido quedó aplicado."}}, ctx);
assert.equal(untouched, undefined);

console.log("verify-gate hooks: 8 assertions passed");
