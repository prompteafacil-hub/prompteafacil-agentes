import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAllowedTags, selectAutoTags, tagsPromptField } from "./allowed-tags";

test("parseAllowedTags limpia la lista escrita con comas", () => {
  assert.deepEqual(parseAllowedTags(" Aprender, servicio ,, SERVICIO, precio "), [
    "aprender",
    "servicio",
    "precio",
  ]);
  assert.deepEqual(parseAllowedTags(["Aprender", 3, "", "aprender"]), ["aprender"]);
  assert.deepEqual(parseAllowedTags(undefined), []);
  assert.deepEqual(parseAllowedTags(""), []);
  assert.deepEqual(parseAllowedTags({}), []);
});

test("sin lista permitida se mantiene el comportamiento libre", () => {
  assert.deepEqual(selectAutoTags([" Interesado ", "precio", "precio", "envío", "otro"], []), [
    "interesado",
    "precio",
    "envío",
  ]);
  assert.deepEqual(selectAutoTags("no es array", []), []);
});

test("con lista permitida descarta todo lo que no está en ella", () => {
  const allowed = parseAllowedTags("aprender, servicio");
  assert.deepEqual(selectAutoTags(["servicio", "precio", "urgente"], allowed), ["servicio"]);
  assert.deepEqual(selectAutoTags(["precio"], allowed), []);
  assert.deepEqual(selectAutoTags([], allowed), []);
});

test("compara sin mayúsculas ni tildes y guarda la etiqueta como está en la lista", () => {
  const allowed = parseAllowedTags("información, aprender");
  assert.deepEqual(selectAutoTags(["INFORMACION", "Aprender", "aprender"], allowed), [
    "información",
    "aprender",
  ]);
});

test("nunca guarda más de 3", () => {
  const allowed = parseAllowedTags("a1, a2, a3, a4");
  assert.equal(selectAutoTags(["a1", "a2", "a3", "a4"], allowed).length, 3);
});

test("el prompt nombra la lista solo cuando hay una", () => {
  assert.match(tagsPromptField([]), /1 a 3 etiquetas cortas/);
  const field = tagsPromptField(["aprender", "servicio"]);
  assert.match(field, /SOLO de esta lista/);
  assert.match(field, /\["aprender","servicio"\]/);
});
