// Etiquetas permitidas del auto-etiquetado (config.allowedTags del agente).
//
// Lista vacía = comportamiento libre de siempre: el modelo inventa 1 a 3
// etiquetas. Con lista, el modelo elige solo de ella y además se valida su
// salida acá: lo que no está en la lista se descarta, aunque el modelo lo
// devuelva.

export const MAX_AUTO_TAGS = 3;
export const MAX_ALLOWED_TAGS = 30;
const MAX_TAG_LENGTH = 40;

function normalizeTag(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
}

/** Clave de comparación: sin mayúsculas ni tildes ("Información" = "informacion"). */
function matchKey(value: string): string {
  return normalizeTag(value).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Lista limpia desde lo que escribió la persona ("aprender, servicio") o desde
 * lo guardado en config (array). Minúsculas, sin vacíos ni repetidos.
 */
export function parseAllowedTags(raw: unknown): string[] {
  const parts: unknown[] =
    typeof raw === "string" ? raw.split(",") : Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (typeof part !== "string") continue;
    const tag = normalizeTag(part);
    const key = matchKey(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_ALLOWED_TAGS) break;
  }
  return out;
}

/**
 * Las etiquetas que se guardan a partir de la respuesta del modelo. Con lista
 * permitida, solo las que están en ella (escritas como en la lista); sin
 * lista, las del modelo normalizadas. Nunca más de MAX_AUTO_TAGS.
 */
export function selectAutoTags(modelTags: unknown, allowed: string[]): string[] {
  if (!Array.isArray(modelTags)) return [];
  const candidates = modelTags
    .filter((t): t is string => typeof t === "string")
    .map(normalizeTag)
    .filter(Boolean);

  const picked: string[] = [];
  if (allowed.length === 0) {
    for (const tag of candidates) if (!picked.includes(tag)) picked.push(tag);
    return picked.slice(0, MAX_AUTO_TAGS);
  }

  const byKey = new Map(allowed.map((tag) => [matchKey(tag), tag]));
  for (const tag of candidates) {
    const canonical = byKey.get(matchKey(tag));
    if (canonical && !picked.includes(canonical)) picked.push(canonical);
  }
  return picked.slice(0, MAX_AUTO_TAGS);
}

/** La instrucción del campo "tags" para el prompt del modelo. */
export function tagsPromptField(allowed: string[]): string {
  if (allowed.length === 0) {
    return '- "tags": array de 1 a 3 etiquetas cortas en minúsculas (ej: ["interesado","precio"]).';
  }
  return `- "tags": array de 0 a ${MAX_AUTO_TAGS} etiquetas elegidas SOLO de esta lista, escritas igual: ${JSON.stringify(
    allowed,
  )}. Si ninguna aplica, devuelve [].`;
}
