// Llamadas del navegador a las rutas de Contactos.

import { contactsQueryString, type ContactsQuery } from "../lib/query-params";
import type { ContactsPage, ContactsSummary } from "../types";

export class ContactsApiError extends Error {
  constructor(
    message: string,
    readonly migrationMissing: boolean,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) {
    throw new ContactsApiError(
      json.error ?? "No se pudieron cargar los contactos",
      json.code === "migration_missing",
    );
  }
  return json;
}

export function fetchContactsPage(
  workspaceId: string,
  query: Partial<ContactsQuery>,
  signal?: AbortSignal,
): Promise<ContactsPage> {
  const qs = contactsQueryString(query);
  return getJson(`/api/workspace/${workspaceId}/contacts${qs ? `?${qs}` : ""}`, signal);
}

export function fetchContactsSummary(
  workspaceId: string,
  filter: { q: string; tags: string[] },
  signal?: AbortSignal,
): Promise<ContactsSummary> {
  const qs = contactsQueryString(filter);
  return getJson(`/api/workspace/${workspaceId}/contacts/summary${qs ? `?${qs}` : ""}`, signal);
}

export function exportCsvHref(workspaceId: string, query: Partial<ContactsQuery>): string {
  const qs = contactsQueryString({ ...query, offset: 0, limit: undefined });
  return `/api/workspace/${workspaceId}/contacts/export${qs ? `?${qs}` : ""}`;
}
