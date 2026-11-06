"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTACT_STAGES, STAGE_LABELS, type ContactStage } from "../lib/stages";
import { appendPage, emptyBoard, moveCard, type BoardState } from "../lib/board-state";
import { fetchContactsPage, ContactsApiError } from "../hooks/contacts-api";
import type { ContactsFilter, CrmContact } from "../types";
import { ContactCard, ContactCardSkeleton } from "./contact-card";
import { StageDot } from "./stage-select";

const COLUMN_PAGE = 30;

interface Props {
  workspaceId: string;
  filter: ContactsFilter;
  canEdit: boolean;
  /** Guarda la etapa; devuelve false si falló (el tablero deshace el cambio). */
  persistStage: (contact: CrmContact, stage: ContactStage) => Promise<boolean>;
  onMigrationMissing: (message: string) => void;
}

export function ContactsBoard({
  workspaceId,
  filter,
  canEdit,
  persistStage,
  onMigrationMissing,
}: Props) {
  const [board, setBoard] = useState<BoardState>(() => emptyBoard());
  const [dragging, setDragging] = useState<CrmContact | null>(null);
  const [over, setOver] = useState<ContactStage | null>(null);
  const [announce, setAnnounce] = useState("");
  // Each filter change starts a new generation; answers of an older one are dropped.
  const generation = useRef(0);
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const loadColumn = useCallback(
    async (stage: ContactStage, gen: number, offset: number) => {
      try {
        const page = await fetchContactsPage(workspaceId, {
          ...filter,
          stage,
          offset,
          limit: COLUMN_PAGE,
        });
        if (gen !== generation.current) return;
        setBoard((b) => ({
          ...b,
          [stage]:
            offset === 0
              ? { items: page.contacts, total: page.total, status: "ready", loadingMore: false }
              : appendPage(b[stage], page.contacts, page.total),
        }));
      } catch (err) {
        if (gen !== generation.current) return;
        if (err instanceof ContactsApiError && err.migrationMissing) onMigrationMissing(err.message);
        setBoard((b) => ({
          ...b,
          [stage]: { ...b[stage], status: offset === 0 ? "error" : b[stage].status, loadingMore: false },
        }));
      }
    },
    [workspaceId, filter, onMigrationMissing],
  );

  useEffect(() => {
    const gen = ++generation.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: a new filter resets the columns before refetching them
    setBoard(emptyBoard());
    for (const stage of CONTACT_STAGES) void loadColumn(stage, gen, 0);
  }, [loadColumn]);

  function loadMore(stage: ContactStage) {
    setBoard((b) => ({ ...b, [stage]: { ...b[stage], loadingMore: true } }));
    void loadColumn(stage, generation.current, boardRef.current[stage].items.length);
  }

  function retry(stage: ContactStage) {
    setBoard((b) => ({ ...b, [stage]: { ...b[stage], status: "loading" } }));
    void loadColumn(stage, generation.current, 0);
  }

  async function move(contact: CrmContact, to: ContactStage) {
    const from = contact.stage;
    if (from === to) return;
    const before = boardRef.current;
    setBoard((b) => moveCard(b, contact.id, from, to));
    const name = contact.name?.trim() || contact.phone;
    const ok = await persistStage(contact, to);
    if (ok) {
      setAnnounce(`${name} pasó a ${STAGE_LABELS[to]}`);
    } else {
      // Undo only this move: keep whatever else changed meanwhile.
      setBoard((b) => {
        const moved = b[to].items.some((c) => c.id === contact.id);
        return moved ? moveCard(b, contact.id, to, from) : before;
      });
    }
  }

  function onDrop(e: React.DragEvent, stage: ContactStage) {
    e.preventDefault();
    setOver(null);
    const card = dragging;
    setDragging(null);
    if (card && card.stage !== stage) void move(card, stage);
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 xl:grid xl:grid-cols-5 xl:overflow-visible"
        role="list"
        aria-label="Tablero de contactos por etapa"
      >
        {CONTACT_STAGES.map((stage) => {
          const column = board[stage];
          const canDrop = canEdit && dragging !== null && dragging.stage !== stage;
          const remaining = column.total - column.items.length;
          return (
            <section
              key={stage}
              role="listitem"
              aria-labelledby={`col-${stage}`}
              onDragOver={(e) => {
                if (!canDrop) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== stage) setOver(stage);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
              }}
              onDrop={(e) => onDrop(e, stage)}
              className={cn(
                "flex w-72 shrink-0 snap-start flex-col rounded-xl border border-border/50 bg-muted/20 xl:w-auto",
                "transition-[border-color,background-color] duration-150",
                over === stage && "border-primary/60 bg-primary/5",
              )}
            >
              <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                <h2 id={`col-${stage}`} className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <StageDot stage={stage} />
                  {STAGE_LABELS[stage]}
                </h2>
                <span
                  className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                  aria-label={`${column.total} contactos`}
                >
                  {column.status === "loading" ? "…" : column.total.toLocaleString("es")}
                </span>
              </header>

              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {column.status === "loading" && (
                  <>
                    <ContactCardSkeleton />
                    <ContactCardSkeleton />
                  </>
                )}

                {column.status === "error" && (
                  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground">No se pudo cargar esta columna.</p>
                    <Button size="sm" variant="outline" onClick={() => retry(stage)}>
                      <RotateCw className="h-4 w-4" aria-hidden="true" />
                      Reintentar
                    </Button>
                  </div>
                )}

                {column.status === "ready" && column.items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    {canEdit ? "Arrastra un contacto aquí" : "Sin contactos"}
                  </p>
                )}

                {column.items.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    canEdit={canEdit}
                    isDragging={dragging?.id === contact.id}
                    onStageChange={(c, s) => void move(c, s)}
                    onDragStart={setDragging}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  />
                ))}

                {column.status === "ready" && remaining > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => loadMore(stage)}
                    disabled={column.loadingMore}
                    aria-busy={column.loadingMore}
                  >
                    {column.loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Cargar más ({remaining.toLocaleString("es")})
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
