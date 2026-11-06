// Parámetros de las rutas de Contactos (?q=&tags=a&tags=b&stage=&sort=&offset=&limit=).

import { z } from "zod";
import { CONTACT_STAGES } from "./stages";
import type { ContactStage } from "./stages";
import type { ContactsSort } from "../types";

export const PAGE_SIZE_DEFAULT = 50;
export const PAGE_SIZE_MAX = 200;
export const MAX_FILTER_TAGS = 20;

const Schema = z.object({
  q: z.string().max(100).optional(),
  stage: z.enum(CONTACT_STAGES).optional(),
  sort: z.enum(["recent", "oldest"]).optional(),
  offset: z.coerce.number().int().min(0).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).optional(),
});

export interface ContactsQuery {
  q: string;
  tags: string[];
  stage: ContactStage | null;
  sort: ContactsSort;
  offset: number;
  limit: number;
}

/**
 * Etiquetas de ?tags=a&tags=b — un parámetro por etiqueta, porque una
 * etiqueta puede tener comas. Sin vacíos ni repetidos; se comparan tal cual
 * están guardadas.
 */
export function parseTagsParam(raw: string[]): string[] {
  const out: string[] = [];
  for (const piece of raw) {
    const tag = piece.trim();
    if (tag && tag.length <= 100 && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_FILTER_TAGS) break;
  }
  return out;
}

export function parseContactsQuery(
  params: URLSearchParams,
): { ok: true; value: ContactsQuery } | { ok: false; error: string } {
  const raw = Object.fromEntries(
    ["q", "stage", "sort", "offset", "limit"]
      .map((k) => [k, params.get(k) ?? undefined])
      .filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos" };
  const v = parsed.data;
  return {
    ok: true,
    value: {
      q: (v.q ?? "").trim(),
      tags: parseTagsParam(params.getAll("tags")),
      stage: v.stage ?? null,
      sort: v.sort ?? "recent",
      offset: v.offset ?? 0,
      limit: v.limit ?? PAGE_SIZE_DEFAULT,
    },
  };
}

/** El querystring que arma el cliente (vacíos fuera). */
export function contactsQueryString(q: Partial<ContactsQuery>): string {
  const sp = new URLSearchParams();
  if (q.q?.trim()) sp.set("q", q.q.trim());
  for (const tag of q.tags ?? []) sp.append("tags", tag);
  if (q.stage) sp.set("stage", q.stage);
  if (q.sort && q.sort !== "recent") sp.set("sort", q.sort);
  if (q.offset) sp.set("offset", String(q.offset));
  if (q.limit) sp.set("limit", String(q.limit));
  return sp.toString();
}
