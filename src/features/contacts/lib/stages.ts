// Etapas del CRM (enum contact_stage) y las reglas de avance automático.

export const CONTACT_STAGES = ["new", "engaged", "qualified", "customer", "lost"] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];

export const STAGE_LABELS: Record<ContactStage, string> = {
  new: "Nuevo",
  engaged: "Interesado",
  qualified: "Calificado",
  customer: "Cliente",
  lost: "Perdido",
};

export function isContactStage(value: unknown): value is ContactStage {
  return typeof value === "string" && (CONTACT_STAGES as readonly string[]).includes(value);
}

/** Qué hizo avanzar al contacto, sin que nadie lo moviera a mano. */
export type StageEvent =
  /** El contacto respondió después de que le escribimos: empezó una conversación. */
  | "contact_replied"
  /** schedule_calcom agendó una cita. */
  | "booking_confirmed";

const TARGET: Record<StageEvent, ContactStage> = {
  contact_replied: "engaged",
  booking_confirmed: "qualified",
};

/**
 * El orden del embudo para lo automático. customer y lost no están: los pone
 * una persona y la automatización nunca los saca de ahí.
 */
const FUNNEL: ContactStage[] = ["new", "engaged", "qualified"];

/**
 * Las etapas desde las que `event` mueve al contacto (siempre hacia adelante)
 * y a cuál. Se usa como condición del UPDATE, así una etapa que alguien cambió
 * mientras tanto nunca se pisa.
 */
export function automaticTransition(event: StageEvent): {
  from: ContactStage[];
  to: ContactStage;
} {
  const to = TARGET[event];
  return { from: FUNNEL.slice(0, FUNNEL.indexOf(to)), to };
}

/** La etapa nueva para un contacto en `current`, o null si no se mueve. */
export function automaticStageFor(
  current: ContactStage,
  event: StageEvent,
): ContactStage | null {
  const { from, to } = automaticTransition(event);
  return from.includes(current) ? to : null;
}
