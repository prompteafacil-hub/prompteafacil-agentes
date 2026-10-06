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
