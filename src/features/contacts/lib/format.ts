// Textos de las tarjetas y la lista de Contactos.

import type { CrmContact } from "../types";

export function contactDisplayName(c: Pick<CrmContact, "name" | "phone">): string {
  const name = c.name?.trim();
  return name ? name : c.phone;
}

const MEDIA_LABELS: Record<string, string> = {
  audio: "Nota de voz",
  image: "Imagen",
  video: "Video",
  document: "Documento",
  sticker: "Sticker",
  location: "Ubicación",
  template: "Plantilla",
};

/** Vista previa del último mensaje: "Tú: …" cuando lo mandamos nosotros. */
export function lastMessagePreview(
  m: CrmContact["lastMessage"],
  max = 90,
): string {
  if (!m) return "";
  const body = (m.body ?? "").replace(/\s+/g, " ").trim();
  const text = body || MEDIA_LABELS[m.type] || "";
  if (!text) return "";
  const short = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return m.direction === "out" ? `Tú: ${short}` : short;
}

/** "ahora", "hace 5 min", "hace 3 h", "hace 2 d", o la fecha si pasó más de una semana. */
export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) return "";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return then.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    ...(then.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
