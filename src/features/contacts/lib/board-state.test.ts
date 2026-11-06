import assert from "node:assert/strict";
import { test } from "node:test";
import { appendPage, emptyBoard, moveCard } from "./board-state";
import type { CrmContact } from "../types";

const c = (id: string, stage: CrmContact["stage"] = "new"): CrmContact => ({
  id,
  phone: "+1",
  name: id,
  email: null,
  stage,
  tags: [],
  optIn: false,
  createdAt: "",
  conversationId: null,
  lastActivityAt: "",
  lastMessage: null,
});

test("moveCard saca la tarjeta de una columna y la pone arriba en la otra", () => {
  let board = emptyBoard("ready");
  board = { ...board, new: { ...board.new, items: [c("a"), c("b")], total: 10 }, qualified: { ...board.qualified, items: [c("z", "qualified")], total: 1 } };
  const next = moveCard(board, "b", "new", "qualified");
  assert.deepEqual(next.new.items.map((x) => x.id), ["a"]);
  assert.equal(next.new.total, 9);
  assert.deepEqual(next.qualified.items.map((x) => x.id), ["b", "z"]);
  assert.equal(next.qualified.items[0].stage, "qualified");
  assert.equal(next.qualified.total, 2);
  assert.equal(board.new.items.length, 2, "no muta el estado anterior (para deshacer)");
});

test("moveCard no hace nada si la etapa es la misma o la tarjeta no está", () => {
  const board = emptyBoard("ready");
  assert.equal(moveCard(board, "x", "new", "new"), board);
  assert.equal(moveCard(board, "x", "new", "lost"), board);
});

test("appendPage no repite tarjetas", () => {
  const col = { items: [c("a"), c("b")], total: 3, status: "ready" as const, loadingMore: true };
  const next = appendPage(col, [c("b"), c("c")], 3);
  assert.deepEqual(next.items.map((x) => x.id), ["a", "b", "c"]);
  assert.equal(next.loadingMore, false);
});
