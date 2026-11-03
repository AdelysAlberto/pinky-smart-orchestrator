/**
 * Self-test for the verify gate.
 *
 * Run with `bun selftest.ts` after editing `verify-gate.ts`. It exercises the pure decision core: which
 * surfaces an edit activates, and whether a later command observed the effective state. The integration
 * with pi (hooks, blocking) is exercised by the extension loading on the next session.
 */

import assert from "node:assert/strict";
import {loadConfig, matchedSurfaces, unobservedSurfaces, type VerifyConfig} from "../verify-gate.ts";

const config: VerifyConfig = {
  mode: "block",
  surfaces: [
    {name: "cron schedules", match: ["/jobs/registry.ts"], observe: "cron_scheduler_configs"},
    {name: "migrations", match: ["/database/migrations/"], observe: "db:migrate"},
    {name: "sin observación", match: ["/anything/"], observe: "  "},
  ],
};

// A surface with a blank observation token is ignored: a half-written config never blocks.
assert.deepEqual(
  matchedSurfaces(config, ["/anything/file.ts"]).map(surface => surface.name),
  []
);

// Editing the default activates its surface.
assert.deepEqual(
  matchedSurfaces(config, ["/repo/backend/src/jobs/registry.ts"]).map(surface => surface.name),
  ["cron schedules"]
);

// The case that motivated the gate: edit the default, run the project's tests, claim the behaviour changed.
const edit = {path: "/repo/backend/src/jobs/registry.ts", seq: 10};
const testsOnly = {command: "bun run test", seq: 20};
assert.deepEqual(
  unobservedSurfaces(config, [edit], [testsOnly]).map(surface => surface.name),
  ["cron schedules"],
  "correr los tests no observa el calendario efectivo"
);

// Observing the SSOT after the edit satisfies the gate.
const observed = {command: "psql -c 'select key, pattern from cron_scheduler_configs'", seq: 21};
assert.deepEqual(unobservedSurfaces(config, [edit], [testsOnly, observed]), []);

// An observation BEFORE the last edit is stale: the edit may have changed the default again.
const earlier = {command: "select key, pattern from cron_scheduler_configs", seq: 5};
assert.deepEqual(
  unobservedSurfaces(config, [edit], [earlier]).map(surface => surface.name),
  ["cron schedules"],
  "una lectura previa a la última edición no vale"
);

// Migrations are only applied when the migration command actually ran.
assert.deepEqual(
  unobservedSurfaces(
    config,
    [{path: "/repo/backend/database/migrations/0025_x.sql", seq: 1}],
    [{command: "git status", seq: 2}, {command: "bun run db:migrate", seq: 3}]
  ),
  []
);

// No edit on a governed surface means nothing to observe.
assert.deepEqual(unobservedSurfaces(config, [{path: "/repo/app/src/a.tsx", seq: 1}], []), []);

// A missing config disables the gate instead of bricking the session.
assert.equal(loadConfig("/tmp/does-not-exist-verify-gate.json"), null);

// Globs work for the paths the real config uses.
assert.deepEqual(
  matchedSurfaces({mode: "block", surfaces: [{name: "g", match: ["**/jobs/registry.ts"], observe: "x"}]}, [
    "/repo/backend/src/jobs/registry.ts",
  ]).length,
  1
);

// The chat annotation only fires for outcome claims, never for plain narration.
import {COMPLETION_CLAIM} from "../verify-gate.ts";
assert.equal(COMPLETION_CLAIM.test("El barrido ya está a diario."), true);
assert.equal(COMPLETION_CLAIM.test("El calendario quedó aplicado a diario."), true);
// Citing the observed state is the wanted phrasing: it must not be flagged.
assert.equal(COMPLETION_CLAIM.test("Cambié el patrón en registry.ts; el estado efectivo es 10 0 * * *."), false);
assert.equal(COMPLETION_CLAIM.test("Voy a leer la fila de cron_scheduler_configs."), false);

console.log("verify-gate selftest: 12 assertions passed");
