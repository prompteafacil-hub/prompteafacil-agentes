// Exportar contactos a CSV (Excel, Google Sheets, Numbers).
//
// - BOM UTF-8 al principio: sin él, Excel muestra mal las tildes.
// - Fin de línea CRLF y comillas dobles escapadas, como pide RFC 4180.
// - Celdas que empiezan con = + - @ (o tab / retorno) se prefijan con ' para
//   que la planilla no las ejecute como fórmula (inyección CSV). Un teléfono
//   como "+5491155550000" no es una fórmula y se deja tal cual.

import { STAGE_LABELS } from "./stages";
import type { CrmContact } from "../types";

export const CSV_HEADERS = [
  "Nombre",
  "Teléfono",
  "Email",
  "Etapa",
  "Etiquetas",
  "Última actividad",
  "Último mensaje",
  "Acepta mensajes",
] as const;

const PHONE_LIKE = /^\+?[\d\s()-]+$/;

export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v) && !PHONE_LIKE.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function contactCsvRow(c: CrmContact): string[] {
  return [
    c.name ?? "",
    c.phone,
    c.email ?? "",
    STAGE_LABELS[c.stage],
    c.tags.join(", "),
    c.lastActivityAt,
    c.lastMessage?.body ?? "",
    c.optIn ? "Sí" : "No",
  ];
}

export function contactsToCsv(rows: CrmContact[], opts: { bom?: boolean } = {}): string {
  const lines = [CSV_HEADERS as readonly string[], ...rows.map(contactCsvRow)].map((cells) =>
    cells.map(csvCell).join(","),
  );
  return `${opts.bom === false ? "" : "﻿"}${lines.join("\r\n")}\r\n`;
}

export function csvFilename(now: Date = new Date()): string {
  return `contactos-${now.toISOString().slice(0, 10)}.csv`;
}
