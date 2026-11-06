import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAllowedInTestMode,
  parseTestNumbers,
  resolveTestNumbers,
  workspaceTestNumbers,
} from "./test-mode";

test("sin variable el modo prueba está apagado y todos pasan", () => {
  assert.deepEqual(parseTestNumbers(undefined), []);
  assert.deepEqual(parseTestNumbers(""), []);
  assert.equal(isAllowedInTestMode("+5491155550000", []), true);
  assert.equal(isAllowedInTestMode(null, []), true);
});

test("parseTestNumbers limpia formato y descarta entradas cortas", () => {
  assert.deepEqual(
    parseTestNumbers(" +54 9 11 5555-0000 , 5215512345678, 123 ,"),
    ["5491155550000", "5215512345678"],
  );
});

test("solo los números de la lista reciben respuesta", () => {
  const allowed = parseTestNumbers("+54 9 11 5555-0000");
  assert.equal(isAllowedInTestMode("5491155550000", allowed), true);
  assert.equal(isAllowedInTestMode("+5491155559999", allowed), false);
  assert.equal(isAllowedInTestMode(null, allowed), false);
  assert.equal(isAllowedInTestMode("", allowed), false);
});

test("tolera el 9 de Argentina y el 1 de México", () => {
  // La persona escribe el número sin el 9; WhatsApp lo entrega con el 9.
  assert.equal(
    isAllowedInTestMode("5491155550000", parseTestNumbers("+54 11 5555 0000")),
    true,
  );
  assert.equal(
    isAllowedInTestMode("5215512345678", parseTestNumbers("+52 55 1234 5678")),
    true,
  );
});

test("los números del workspace mandan sobre AI_TEST_NUMBERS", () => {
  const r = resolveTestNumbers(
    { timezone: "America/Mexico_City", ai_test_numbers: ["+52 55 1234 5678"] },
    "+5491155550000",
  );
  assert.equal(r.source, "workspace");
  assert.deepEqual(r.numbers, ["525512345678"]);
  assert.equal(isAllowedInTestMode("5215512345678", r.numbers), true);
  // El número global no pasa en ESTE workspace: tiene su propia lista.
  assert.equal(isAllowedInTestMode("5491155550000", r.numbers), false);
});

test("sin lista propia cae a AI_TEST_NUMBERS (compatibilidad)", () => {
  for (const settings of [{}, { ai_test_numbers: [] }, { ai_test_numbers: ["12"] }, null, undefined]) {
    const r = resolveTestNumbers(settings, "+54 9 11 5555-0000");
    assert.equal(r.source, "env");
    assert.deepEqual(r.numbers, ["5491155550000"]);
  }
});

test("sin lista propia ni variable, el modo está apagado", () => {
  const r = resolveTestNumbers({ ai_test_numbers: [] }, undefined);
  assert.equal(r.source, "off");
  assert.deepEqual(r.numbers, []);
  assert.equal(isAllowedInTestMode("+5491155550000", r.numbers), true);
});

test("workspaceTestNumbers acepta texto con comas y descarta basura", () => {
  assert.deepEqual(workspaceTestNumbers({ ai_test_numbers: "+54 11 5555 0000, abc" }), ["541155550000"]);
  assert.deepEqual(workspaceTestNumbers({ ai_test_numbers: [5491155550000, "+5491155550000"] }), [
    "5491155550000",
  ]);
  assert.deepEqual(workspaceTestNumbers({ ai_test_numbers: { a: 1 } }), []);
});
