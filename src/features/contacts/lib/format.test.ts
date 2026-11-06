import assert from "node:assert/strict";
import { test } from "node:test";
import { contactDisplayName, lastMessagePreview, relativeTime } from "./format";

test("nombre o teléfono si no tiene nombre", () => {
  assert.equal(contactDisplayName({ name: "Ana", phone: "+54" }), "Ana");
  assert.equal(contactDisplayName({ name: "  ", phone: "+5491155550000" }), "+5491155550000");
  assert.equal(contactDisplayName({ name: null, phone: "+5491155550000" }), "+5491155550000");
});

test("vista previa: marca lo nuestro, nombra la multimedia y recorta", () => {
  assert.equal(lastMessagePreview({ body: "Hola", direction: "out", type: "text" }), "Tú: Hola");
  assert.equal(lastMessagePreview({ body: null, direction: "in", type: "audio" }), "Nota de voz");
  assert.equal(lastMessagePreview(null), "");
  const long = lastMessagePreview({ body: "a".repeat(200), direction: "in", type: "text" }, 10);
  assert.equal(long, `${"a".repeat(9)}…`);
});

test("tiempo relativo", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  assert.equal(relativeTime("2026-11-06T11:59:40Z", now), "ahora");
  assert.equal(relativeTime("2026-11-06T11:55:00Z", now), "hace 5 min");
  assert.equal(relativeTime("2026-11-06T09:00:00Z", now), "hace 3 h");
  assert.equal(relativeTime("2026-11-04T12:00:00Z", now), "hace 2 d");
  assert.equal(relativeTime(null, now), "");
  assert.match(relativeTime("2026-10-01T12:00:00Z", now), /oct/);
});
