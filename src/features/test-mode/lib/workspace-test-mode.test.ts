import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTestNumbersInput, withTestNumbers } from "./workspace-test-mode";
import { resolveTestNumbers } from "@/features/inbox/services/test-mode";

test("normaliza números escritos con espacios, guiones y saltos de línea", () => {
  assert.deepEqual(normalizeTestNumbersInput("+54 9 11 5555-0000,\n+52 55 1234 5678; +54 9 11 5555-0000"), {
    numbers: ["+5491155550000", "+525512345678"],
    invalid: [],
  });
});

test("separa lo que no es un número", () => {
  assert.deepEqual(normalizeTestNumbersInput("123, hola, +54 11 5555 0000"), {
    numbers: ["+541155550000"],
    invalid: ["123", "hola"],
  });
  assert.deepEqual(normalizeTestNumbersInput("   "), { numbers: [], invalid: [] });
});

test("withTestNumbers conserva el resto de settings y una lista vacía borra la clave", () => {
  const settings = { timezone: "America/Bogota", language: "es" };
  const on = withTestNumbers(settings, ["+5491155550000"]);
  assert.deepEqual(on, { timezone: "America/Bogota", language: "es", ai_test_numbers: ["+5491155550000"] });
  assert.deepEqual(settings, { timezone: "America/Bogota", language: "es" }, "no muta el original");
  assert.deepEqual(withTestNumbers(on, []), { timezone: "America/Bogota", language: "es" });
  assert.deepEqual(withTestNumbers(null, []), {});
});

test("lo guardado es lo que lee el motor de decisión", () => {
  const saved = withTestNumbers({}, normalizeTestNumbersInput("+52 55 1234 5678").numbers);
  const r = resolveTestNumbers(saved, "+5491155550000");
  assert.equal(r.source, "workspace");
  assert.deepEqual(r.numbers, ["525512345678"]);
});
