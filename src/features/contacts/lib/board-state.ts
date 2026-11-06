// Estado del tablero: mover una tarjeta de columna (optimista) y deshacerlo.

import { CONTACT_STAGES, type ContactStage } from "./stages";
import type { CrmContact } from "../types";

export interface BoardColumn {
  items: CrmContact[];
  total: number;
  status: "loading" | "ready" | "error";
  loadingMore: boolean;
}

export type BoardState = Record<ContactStage, BoardColumn>;

export function emptyBoard(status: BoardColumn["status"] = "loading"): BoardState {
  return Object.fromEntries(
    CONTACT_STAGES.map((s) => [s, { items: [], total: 0, status, loadingMore: false }]),
  ) as unknown as BoardState;
}

/**
 * La tarjeta pasa de `from` a `to`: sale de una columna, entra arriba en la
 * otra y los contadores se ajustan. Sin cambios si ya estaba en `to` o no está.
 */
export function moveCard(
  board: BoardState,
  contactId: string,
  from: ContactStage,
  to: ContactStage,
): BoardState {
  if (from === to) return board;
  const source = board[from];
  const card = source.items.find((c) => c.id === contactId);
  if (!card) return board;
  const target = board[to];
  return {
    ...board,
    [from]: {
      ...source,
      items: source.items.filter((c) => c.id !== contactId),
      total: Math.max(0, source.total - 1),
    },
    [to]: {
      ...target,
      items: [{ ...card, stage: to }, ...target.items.filter((c) => c.id !== contactId)],
      total: target.total + 1,
    },
  };
}

/** Agrega una página a la columna sin repetir tarjetas que ya están. */
export function appendPage(column: BoardColumn, page: CrmContact[], total: number): BoardColumn {
  const seen = new Set(column.items.map((c) => c.id));
  return {
    ...column,
    items: [...column.items, ...page.filter((c) => !seen.has(c.id))],
    total,
    status: "ready",
    loadingMore: false,
  };
}
