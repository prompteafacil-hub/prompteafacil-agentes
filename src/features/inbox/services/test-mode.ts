// Modo prueba (prompteafacil): limita las respuestas de la IA a una lista de
// números mientras se configura o se demuestra el agente sobre un número real.
//
// Se activa con la variable de entorno AI_TEST_NUMBERS (números separados por
// coma, con o sin "+", espacios o guiones). Sin la variable, el modo está
// apagado y la IA responde a todos, como siempre.
//
// La comparación usa los últimos 10 dígitos: WhatsApp entrega algunos números
// con un formato distinto del que la persona escribe (por ejemplo, el "9" de
// Argentina o el "1" de México después del código de país).

const SUFFIX_LENGTH = 10;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function suffix(value: string): string {
  const d = digits(value);
  return d.length > SUFFIX_LENGTH ? d.slice(-SUFFIX_LENGTH) : d;
}

/** Números permitidos en modo prueba; lista vacía = modo apagado. */
export function parseTestNumbers(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => digits(n))
    .filter((n) => n.length >= 8);
}

/** true si el modo está apagado o si el teléfono está en la lista. */
export function isAllowedInTestMode(
  phone: string | null | undefined,
  allowed: string[],
): boolean {
  if (allowed.length === 0) return true;
  if (!phone) return false;
  const target = suffix(phone);
  if (target.length < 8) return false;
  return allowed.some((n) => suffix(n) === target);
}

// ── Modo prueba por workspace ────────────────────────────────────────────────
// Un workspace puede tener su propia lista en workspaces.settings.ai_test_numbers
// (la configura un admin en Configuración → Integraciones). Precedencia:
//   1. el workspace tiene números propios → se usan esos (solo en ese workspace);
//   2. si no, AI_TEST_NUMBERS (global, para toda la instalación);
//   3. si tampoco, modo apagado.

export const WORKSPACE_TEST_NUMBERS_KEY = "ai_test_numbers";

/** Los números guardados en settings del workspace (array o texto con comas). */
export function workspaceTestNumbers(settings: unknown): string[] {
  if (typeof settings !== "object" || settings === null) return [];
  const raw = (settings as Record<string, unknown>)[WORKSPACE_TEST_NUMBERS_KEY];
  if (typeof raw === "string") return parseTestNumbers(raw);
  if (Array.isArray(raw)) {
    return parseTestNumbers(raw.filter((n): n is string => typeof n === "string").join(","));
  }
  return [];
}

export type TestModeSource = "workspace" | "env" | "off";

export function resolveTestNumbers(
  settings: unknown,
  envValue: string | undefined | null,
): { numbers: string[]; source: TestModeSource } {
  const own = workspaceTestNumbers(settings);
  if (own.length > 0) return { numbers: own, source: "workspace" };
  const global = parseTestNumbers(envValue);
  if (global.length > 0) return { numbers: global, source: "env" };
  return { numbers: [], source: "off" };
}
