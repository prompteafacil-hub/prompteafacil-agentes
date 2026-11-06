import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCliMajor, remoteTargetFlags, supabaseRemoteCommand } from "./supabase-cli.mjs";

test("parseCliMajor lee la versión en los formatos que imprime el CLI", () => {
  assert.equal(parseCliMajor("3.0.0"), 3);
  assert.equal(parseCliMajor("2.20.5\n"), 2);
  assert.equal(parseCliMajor("v1.226.4"), 1);
  assert.equal(parseCliMajor("A new version of Supabase CLI is available: v3.1.0\n2.48.3"), 3);
  assert.equal(parseCliMajor(""), null);
  assert.equal(parseCliMajor(undefined), null);
  assert.equal(parseCliMajor("command not found"), null);
});

test("CLI v3 o superior apunta al proyecto enlazado con --remote y --yes", () => {
  assert.deepEqual(remoteTargetFlags(3), ["--remote", "--yes"]);
  assert.deepEqual(remoteTargetFlags(4), ["--remote", "--yes"]);
});

test("CLI v1 y v2 no reciben flags: ya apuntan al proyecto enlazado", () => {
  assert.deepEqual(remoteTargetFlags(2), []);
  assert.deepEqual(remoteTargetFlags(1), []);
  // Aunque la ayuda mencione --remote, la versión manda.
  assert.deepEqual(remoteTargetFlags(2, "--remote"), []);
});

test("sin versión legible decide por la ayuda del comando", () => {
  assert.deepEqual(
    remoteTargetFlags(null, "TARGET\n  Local by default. Pass --remote for the linked project"),
    ["--remote", "--yes"],
  );
  assert.deepEqual(remoteTargetFlags(null, "--linked  Pushes to the linked project. (default true)"), []);
  assert.deepEqual(remoteTargetFlags(null), []);
});

test("supabaseRemoteCommand arma la línea completa", () => {
  assert.equal(supabaseRemoteCommand("supabase db push", ["--remote", "--yes"]), "supabase db push --remote --yes");
  assert.equal(supabaseRemoteCommand("supabase db push", []), "supabase db push");
});
