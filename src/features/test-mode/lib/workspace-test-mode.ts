// Modo prueba por workspace: cómo se guarda la lista en workspaces.settings.
// La regla de quién recibe respuesta vive en inbox/services/test-mode.ts.

import { WORKSPACE_TEST_NUMBERS_KEY } from "@/features/inbox/services/test-mode";

export const MAX_WORKSPACE_TEST_NUMBERS = 20;

/**
 * Lo que escribió el admin (separado por comas, espacios o saltos de línea)
 * → números en formato +dígitos, sin repetidos, y lo que no parece un número.
 */
export function normalizeTestNumbersInput(raw: string): {
  numbers: string[];
  invalid: string[];
} {
  const numbers: string[] = [];
  const invalid: string[] = [];
  for (const piece of raw.split(/[,;\n]+/)) {
    const entry = piece.trim();
    if (!entry) continue;
    const digits = entry.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || /[a-z]/i.test(entry)) {
      invalid.push(entry);
      continue;
    }
    const formatted = `+${digits}`;
    if (!numbers.includes(formatted)) numbers.push(formatted);
  }
  return { numbers, invalid };
}

/** settings con la lista nueva; el resto de las claves queda igual. Lista vacía = sin lista propia. */
export function withTestNumbers(
  settings: unknown,
  numbers: string[],
): Record<string, unknown> {
  const base =
    typeof settings === "object" && settings !== null && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  if (numbers.length === 0) {
    delete base[WORKSPACE_TEST_NUMBERS_KEY];
  } else {
    base[WORKSPACE_TEST_NUMBERS_KEY] = numbers;
  }
  return base;
}
