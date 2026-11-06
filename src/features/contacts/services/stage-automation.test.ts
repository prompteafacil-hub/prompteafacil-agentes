import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { markEngagedIfConversationStarted, promoteContactStage } from "./stage-automation";

type Row = Record<string, unknown>;

/** In-memory PostgREST fake: honors the filters the service uses. */
function fakeDb(tables: Record<string, Row[]>, opts: { failUpdate?: boolean } = {}) {
  const updates: Row[] = [];
  function query(table: string, patch?: Row) {
    const filters: Array<(r: Row) => boolean> = [];
    let limit = Infinity;
    const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
    const exec = () => {
      if (patch) {
        if (opts.failUpdate) return { data: null, error: { code: "XX000", message: "boom" } };
        const hit = rows();
        hit.forEach((r) => Object.assign(r, patch));
        updates.push(patch);
        return { data: hit, error: null };
      }
      return { data: rows().slice(0, limit), error: null };
    };
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), b),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), b),
      lt: (c: string, v: string) => (filters.push((r) => String(r[c]) < v), b),
      limit: (n: number) => ((limit = n), Promise.resolve(exec())),
      maybeSingle: async () => {
        const r = exec();
        return { data: (r.data as Row[] | null)?.[0] ?? null, error: r.error };
      },
    };
    return b;
  }
  const db = {
    from: (table: string) => ({
      select: () => query(table),
      update: (patch: Row) => query(table, patch),
    }),
  } as unknown as SupabaseClient;
  return { db, updates };
}

const base = (stage: string, extra: Row[] = []) => ({
  contacts: [
    { id: "c1", workspace_id: "ws1", stage },
    { id: "c1", workspace_id: "ws_other", stage: "new" },
  ],
  messages: extra,
});

const OPTS = { workspaceId: "ws1", conversationId: "conv1", contactId: "c1", inboundAt: "2026-11-06T10:05:00Z" };

test("engaged: el contacto respondió a un mensaje nuestro", async () => {
  const tables = base("new", [
    { workspace_id: "ws1", conversation_id: "conv1", direction: "out", type: "text", created_at: "2026-11-06T10:00:00Z" },
  ]);
  const { db } = fakeDb(tables);
  assert.equal(await markEngagedIfConversationStarted(db, OPTS), "engaged");
  assert.equal(tables.contacts[0].stage, "engaged");
  assert.equal(tables.contacts[1].stage, "new", "no toca otro workspace");
});

test("engaged: un primer mensaje sin respuesta nuestra no cuenta", async () => {
  const tables = base("new", [
    { workspace_id: "ws1", conversation_id: "conv1", direction: "in", type: "text", created_at: "2026-11-06T10:00:00Z" },
    // Respuesta posterior al mensaje del contacto: no es "respondió a lo nuestro".
    { workspace_id: "ws1", conversation_id: "conv1", direction: "out", type: "text", created_at: "2026-11-06T10:06:00Z" },
  ]);
  const { db, updates } = fakeDb(tables);
  assert.equal(await markEngagedIfConversationStarted(db, OPTS), null);
  assert.equal(updates.length, 0);
});

test("engaged: las notas internas no cuentan como mensaje nuestro", async () => {
  const tables = base("new", [
    { workspace_id: "ws1", conversation_id: "conv1", direction: "out", type: "system", created_at: "2026-11-06T10:00:00Z" },
  ]);
  const { db } = fakeDb(tables);
  assert.equal(await markEngagedIfConversationStarted(db, OPTS), null);
  assert.equal(tables.contacts[0].stage, "new");
});

test("engaged: si ya no está en new no hace nada (ni lo baja)", async () => {
  for (const stage of ["engaged", "qualified", "customer", "lost"]) {
    const tables = base(stage, [
      { workspace_id: "ws1", conversation_id: "conv1", direction: "out", type: "text", created_at: "2026-11-06T10:00:00Z" },
    ]);
    const { db, updates } = fakeDb(tables);
    assert.equal(await markEngagedIfConversationStarted(db, OPTS), null, stage);
    assert.equal(updates.length, 0, stage);
    assert.equal(tables.contacts[0].stage, stage);
  }
});

test("qualified: una cita agendada sube desde new y engaged", async () => {
  for (const stage of ["new", "engaged"]) {
    const tables = base(stage);
    const { db } = fakeDb(tables);
    const r = await promoteContactStage(db, { workspaceId: "ws1", contactId: "c1", event: "booking_confirmed" });
    assert.equal(r, "qualified");
    assert.equal(tables.contacts[0].stage, "qualified");
  }
});

test("qualified: nunca saca a un contacto de customer ni de lost", async () => {
  for (const stage of ["customer", "lost", "qualified"]) {
    const tables = base(stage);
    const { db } = fakeDb(tables);
    const r = await promoteContactStage(db, { workspaceId: "ws1", contactId: "c1", event: "booking_confirmed" });
    assert.equal(r, null, stage);
    assert.equal(tables.contacts[0].stage, stage);
  }
});

test("un error de la base no lanza: devuelve null", async () => {
  const { db } = fakeDb(base("new"), { failUpdate: true });
  const r = await promoteContactStage(db, { workspaceId: "ws1", contactId: "c1", event: "booking_confirmed" });
  assert.equal(r, null);
});
