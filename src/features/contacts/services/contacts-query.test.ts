import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listContacts, listContactsForExport, loadContactsSummary } from "./contacts-query";

const row = (i: number, total: number) => ({
  id: `c${i}`,
  phone: `+54911555500${String(i).padStart(2, "0")}`,
  name: i % 2 ? `Contacto ${i}` : null,
  email: null,
  stage: "new",
  tags: null,
  opt_in: false,
  created_at: "2026-11-01T00:00:00Z",
  conversation_id: i % 3 ? `conv${i}` : null,
  last_activity_at: "2026-11-06T00:00:00Z",
  last_message_body: i % 3 ? "hola" : null,
  last_message_direction: i % 3 ? "in" : null,
  last_message_type: i % 3 ? "text" : null,
  total_count: String(total),
});

function fakeRpc(handler: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown }) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return handler(fn, args);
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const QUERY = { q: "", tags: [], stage: null, sort: "recent" as const, offset: 0, limit: 50 };

test("listContacts pasa los filtros al RPC y mapea las filas", async () => {
  const { db, calls } = fakeRpc(() => ({ data: [row(1, 7)], error: null }));
  const r = await listContacts(db, "ws1", { ...QUERY, q: "ana", tags: ["vip"], stage: "engaged" });
  assert.ok(r.ok);
  assert.equal(r.data.total, 7);
  assert.equal(r.data.contacts[0].tags.length, 0);
  assert.deepEqual(r.data.contacts[0].lastMessage, { body: "hola", direction: "in", type: "text" });
  assert.deepEqual(calls[0], {
    fn: "crm_list_contacts",
    args: {
      p_workspace_id: "ws1",
      p_stage: "engaged",
      p_search: "ana",
      p_tags: ["vip"],
      p_sort: "recent",
      p_limit: 50,
      p_offset: 0,
    },
  });
});

test("sin la migración avisa en vez de fallar a ciegas", async () => {
  const { db } = fakeRpc(() => ({
    data: null,
    error: { code: "PGRST202", message: "Could not find the function public.crm_list_contacts", hint: null },
  }));
  assert.deepEqual(await listContacts(db, "ws1", QUERY), { ok: false, reason: "migration_missing" });
});

test("loadContactsSummary completa las etapas sin contactos con 0", async () => {
  const { db } = fakeRpc((fn) =>
    fn === "crm_stage_counts"
      ? { data: [{ stage: "new", total: "3" }, { stage: "lost", total: 1 }], error: null }
      : { data: [{ tag: "vip" }], error: null },
  );
  const r = await loadContactsSummary(db, "ws1", { q: "", tags: [] });
  assert.ok(r.ok);
  assert.deepEqual(r.data.counts, { new: 3, engaged: 0, qualified: 0, customer: 0, lost: 1 });
  assert.deepEqual(r.data.availableTags, ["vip"]);
});

test("el export pagina hasta el final y respeta el tope", async () => {
  const TOTAL = 1200;
  const { db, calls } = fakeRpc((_fn, args) => {
    const offset = args.p_offset as number;
    const limit = args.p_limit as number;
    const n = Math.max(0, Math.min(limit, TOTAL - offset));
    return { data: Array.from({ length: n }, (_, i) => row(offset + i, TOTAL)), error: null };
  });
  const all = await listContactsForExport(db, "ws1", { q: "", tags: [], stage: null, sort: "recent" });
  assert.ok(all.ok);
  assert.equal(all.data.contacts.length, TOTAL);
  assert.equal(all.data.truncated, false);
  assert.equal(calls.length, 3);

  const capped = await listContactsForExport(db, "ws1", { q: "", tags: [], stage: null, sort: "recent" }, 600);
  assert.ok(capped.ok);
  assert.equal(capped.data.contacts.length, 600);
  assert.equal(capped.data.truncated, true);
});
