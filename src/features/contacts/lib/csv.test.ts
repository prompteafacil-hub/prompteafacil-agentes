import assert from "node:assert/strict";
import { test } from "node:test";
import { contactsToCsv, csvCell, csvFilename, CSV_HEADERS } from "./csv";
import type { CrmContact } from "../types";

const contact = (over: Partial<CrmContact> = {}): CrmContact => ({
  id: "c1",
  phone: "+5491155550000",
  name: "Ana Pérez",
  email: "ana@example.com",
  stage: "engaged",
  tags: ["aprender", "servicio"],
  optIn: true,
  createdAt: "2026-11-01T10:00:00.000Z",
  conversationId: "conv1",
  lastActivityAt: "2026-11-06T10:05:00.000Z",
  lastMessage: { body: "Hola, ¿cuánto cuesta?", direction: "in", type: "text" },
  ...over,
});

test("encabezados en español y una fila por contacto, con BOM y CRLF", () => {
  const csv = contactsToCsv([contact()]);
  assert.ok(csv.startsWith("﻿"), "BOM para que Excel lea las tildes");
  const lines = csv.slice(1).split("\r\n");
  assert.equal(lines[0], CSV_HEADERS.join(","));
  assert.equal(
    lines[1],
    'Ana Pérez,+5491155550000,ana@example.com,Interesado,"aprender, servicio",2026-11-06T10:05:00.000Z,"Hola, ¿cuánto cuesta?",Sí',
  );
  assert.equal(lines[2], "", "termina en salto de línea");
});

test("escapa comillas, comas y saltos de línea", () => {
  assert.equal(csvCell('dijo "hola"'), '"dijo ""hola"""');
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("línea 1\nlínea 2"), '"línea 1\nlínea 2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell("simple"), "simple");
});

test("neutraliza fórmulas (inyección CSV) pero deja los teléfonos", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(csvCell("-2+3"), "'-2+3");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("+54 9 11 5555-0000"), "+54 9 11 5555-0000");
  assert.equal(csvCell("+5491155550000"), "+5491155550000");
});

test("contacto sin nombre, sin email, sin mensajes y sin opt-in", () => {
  const csv = contactsToCsv(
    [contact({ name: null, email: null, tags: [], lastMessage: null, optIn: false, stage: "lost" })],
    { bom: false },
  );
  assert.equal(csv.split("\r\n")[1], ",+5491155550000,,Perdido,,2026-11-06T10:05:00.000Z,,No");
});

test("solo encabezados si no hay contactos", () => {
  assert.equal(contactsToCsv([], { bom: false }), `${CSV_HEADERS.join(",")}\r\n`);
});

test("nombre del archivo con la fecha", () => {
  assert.equal(csvFilename(new Date("2026-11-06T15:00:00Z")), "contactos-2026-11-06.csv");
});
