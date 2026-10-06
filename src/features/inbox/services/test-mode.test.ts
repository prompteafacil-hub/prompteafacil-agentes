import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedInTestMode, parseTestNumbers } from "./test-mode";

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
