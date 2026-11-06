// Avance automático de etapa del CRM (prompteafacil):
//   - el contacto responde después de que le escribimos → new → engaged;
//   - schedule_calcom agenda una cita → new/engaged → qualified.
// Nunca hacia atrás, y nunca saca a nadie de customer ni de lost. Corre con
// service role desde el buffer; nunca lanza: una etapa que no se movió no
// puede tirar el turno del agente.

import type { SupabaseClient } from "@supabase/supabase-js";
import { automaticTransition, type ContactStage, type StageEvent } from "../lib/stages";

/** Las tools cuyo éxito significa "agendó": el contacto queda calificado. */
export const BOOKING_TOOLS = new Set(["schedule_calcom"]);

/**
 * Mueve la etapa si corresponde. El UPDATE solo matchea las etapas de origen
 * permitidas, así que es atómico frente a una persona que la cambia a la vez.
 * Devuelve la etapa nueva, o null si no se movió.
 */
export async function promoteContactStage(
  db: SupabaseClient,
  opts: { workspaceId: string; contactId: string; event: StageEvent },
): Promise<ContactStage | null> {
  const { from, to } = automaticTransition(opts.event);
  try {
    const { data, error } = await db
      .from("contacts")
      .update({ stage: to, updated_at: new Date().toISOString() })
      .eq("workspace_id", opts.workspaceId)
      .eq("id", opts.contactId)
      .in("stage", from)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[stage-automation] update failed:", error.code ?? error.message);
      return null;
    }
    return data ? to : null;
  } catch (err) {
    console.error("[stage-automation] update threw:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * new → engaged cuando el contacto escribe y ya le habíamos escrito antes (el
 * agente, una persona o una plantilla; las notas internas no cuentan). Un
 * primer "hola" sin respuesta todavía no es una conversación.
 */
export async function markEngagedIfConversationStarted(
  db: SupabaseClient,
  opts: {
    workspaceId: string;
    conversationId: string;
    contactId: string;
    /** El último mensaje del contacto en este turno: lo nuestro tiene que ser anterior. */
    inboundAt?: string;
  },
): Promise<ContactStage | null> {
  try {
    const { data: contact, error: contactError } = await db
      .from("contacts")
      .select("stage")
      .eq("workspace_id", opts.workspaceId)
      .eq("id", opts.contactId)
      .maybeSingle();
    if (contactError || !contact) return null;
    if ((contact as { stage: string }).stage !== "new") return null;

    let outbound = db
      .from("messages")
      .select("id")
      .eq("workspace_id", opts.workspaceId)
      .eq("conversation_id", opts.conversationId)
      .eq("direction", "out")
      .neq("type", "system");
    if (opts.inboundAt) outbound = outbound.lt("created_at", opts.inboundAt);
    const { data: rows, error: outError } = await outbound.limit(1);
    if (outError || !rows || rows.length === 0) return null;

    return await promoteContactStage(db, {
      workspaceId: opts.workspaceId,
      contactId: opts.contactId,
      event: "contact_replied",
    });
  } catch (err) {
    console.error("[stage-automation] engaged check threw:", err instanceof Error ? err.message : err);
    return null;
  }
}
