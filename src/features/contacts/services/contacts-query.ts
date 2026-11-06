// Lecturas de la página Contactos. Corren con service_role (las funciones
// crm_* solo se ejecutan así): quien llama verifica antes que el usuario es
// miembro activo del workspace, y todo se filtra por workspace_id.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingFunctionError, reportMissingFunctionOnce } from "@/shared/lib/db-errors";
import { CONTACT_STAGES, isContactStage, type ContactStage } from "../lib/stages";
import type { ContactsQuery } from "../lib/query-params";
import type { ContactsPage, ContactsSummary, CrmContact } from "../types";

export const MIGRATION_MISSING_MESSAGE =
  "Falta aplicar la última migración de la base. Corre `node scripts/setup.mjs db-push` y vuelve a cargar la página.";

export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "migration_missing" | "error" };

interface RawRow {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  stage: string;
  tags: string[] | null;
  opt_in: boolean;
  created_at: string;
  conversation_id: string | null;
  last_activity_at: string;
  last_message_body: string | null;
  last_message_direction: "in" | "out" | null;
  last_message_type: string | null;
  total_count: number | string;
}

export function toCrmContact(r: RawRow): CrmContact {
  return {
    id: r.id,
    phone: r.phone,
    name: r.name,
    email: r.email,
    stage: isContactStage(r.stage) ? r.stage : "new",
    tags: r.tags ?? [],
    optIn: r.opt_in,
    createdAt: r.created_at,
    conversationId: r.conversation_id,
    lastActivityAt: r.last_activity_at,
    lastMessage: r.last_message_direction
      ? {
          body: r.last_message_body,
          direction: r.last_message_direction,
          type: r.last_message_type ?? "text",
        }
      : null,
  };
}

function failure(error: unknown, fn: string): { ok: false; reason: "migration_missing" | "error" } {
  if (isMissingFunctionError(error, fn)) {
    reportMissingFunctionOnce(fn, "the Contactos page shows the db-push notice");
    return { ok: false, reason: "migration_missing" };
  }
  console.error(`[contacts] ${fn} failed:`, (error as { code?: string } | null)?.code ?? error);
  return { ok: false, reason: "error" };
}

export async function listContacts(
  db: SupabaseClient,
  workspaceId: string,
  query: ContactsQuery,
): Promise<QueryResult<ContactsPage>> {
  const { data, error } = await db.rpc("crm_list_contacts", {
    p_workspace_id: workspaceId,
    p_stage: query.stage,
    p_search: query.q || null,
    p_tags: query.tags.length > 0 ? query.tags : null,
    p_sort: query.sort,
    p_limit: query.limit,
    p_offset: query.offset,
  });
  if (error) return failure(error, "crm_list_contacts");
  const rows = (data ?? []) as RawRow[];
  return {
    ok: true,
    data: {
      contacts: rows.map(toCrmContact),
      // Every row carries the filter's total; an empty page reports 0.
      total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    },
  };
}

export async function loadContactsSummary(
  db: SupabaseClient,
  workspaceId: string,
  filter: { q: string; tags: string[] },
): Promise<QueryResult<ContactsSummary>> {
  const [counts, tags] = await Promise.all([
    db.rpc("crm_stage_counts", {
      p_workspace_id: workspaceId,
      p_search: filter.q || null,
      p_tags: filter.tags.length > 0 ? filter.tags : null,
    }),
    db.rpc("get_workspace_tags", { p_workspace_id: workspaceId }),
  ]);
  if (counts.error) return failure(counts.error, "crm_stage_counts");
  if (tags.error) return failure(tags.error, "get_workspace_tags");

  const byStage = Object.fromEntries(CONTACT_STAGES.map((s) => [s, 0])) as Record<
    ContactStage,
    number
  >;
  for (const row of (counts.data ?? []) as Array<{ stage: string; total: number | string }>) {
    if (isContactStage(row.stage)) byStage[row.stage] = Number(row.total);
  }
  return {
    ok: true,
    data: {
      counts: byStage,
      availableTags: ((tags.data ?? []) as Array<{ tag: string }>).map((t) => t.tag),
    },
  };
}

/** Todas las filas del filtro para el CSV, en páginas, hasta `max`. */
export async function listContactsForExport(
  db: SupabaseClient,
  workspaceId: string,
  query: Omit<ContactsQuery, "offset" | "limit">,
  max = 10_000,
): Promise<QueryResult<{ contacts: CrmContact[]; truncated: boolean }>> {
  const PAGE = 500;
  const all: CrmContact[] = [];
  let total = Infinity;
  for (let offset = 0; offset < Math.min(total, max); offset += PAGE) {
    const page = await listContacts(db, workspaceId, {
      ...query,
      offset,
      limit: PAGE,
    });
    if (!page.ok) return page;
    total = page.data.total;
    all.push(...page.data.contacts);
    if (page.data.contacts.length < PAGE) break;
  }
  return { ok: true, data: { contacts: all.slice(0, max), truncated: total > max } };
}
