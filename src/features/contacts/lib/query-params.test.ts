import assert from "node:assert/strict";
import { test } from "node:test";
import { contactsQueryString, parseContactsQuery, PAGE_SIZE_MAX } from "./query-params";

test("valores por defecto", () => {
  const r = parseContactsQuery(new URLSearchParams());
  assert.deepEqual(r, {
    ok: true,
    value: { q: "", tags: [], stage: null, sort: "recent", offset: 0, limit: 50 },
  });
});

test("lee filtros y etiquetas repetidas (una etiqueta puede tener comas)", () => {
  const r = parseContactsQuery(
    new URLSearchParams("q=+ana+&tags=precio, alto&tags=vip&tags=vip&tags=&stage=qualified&sort=oldest&offset=50&limit=25"),
  );
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    q: "ana",
    tags: ["precio, alto", "vip"],
    stage: "qualified",
    sort: "oldest",
    offset: 50,
    limit: 25,
  });
});

test("rechaza etapas, orden y tamaños inválidos", () => {
  assert.equal(parseContactsQuery(new URLSearchParams("stage=ganado")).ok, false);
  assert.equal(parseContactsQuery(new URLSearchParams("sort=name")).ok, false);
  assert.equal(parseContactsQuery(new URLSearchParams(`limit=${PAGE_SIZE_MAX + 1}`)).ok, false);
  assert.equal(parseContactsQuery(new URLSearchParams("offset=-1")).ok, false);
});

test("contactsQueryString es la inversa", () => {
  const qs = contactsQueryString({ q: "ana", tags: ["precio, alto", "vip"], stage: "new", offset: 50, limit: 30 });
  const back = parseContactsQuery(new URLSearchParams(qs));
  assert.ok(back.ok);
  assert.deepEqual(back.value.tags, ["precio, alto", "vip"]);
  assert.equal(back.value.stage, "new");
  assert.equal(contactsQueryString({ q: " ", tags: [], sort: "recent" }), "");
});
