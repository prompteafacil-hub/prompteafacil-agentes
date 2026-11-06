"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MessageCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contactDisplayName, lastMessagePreview, relativeTime } from "../lib/format";
import { CONTACT_STAGES, STAGE_LABELS, type ContactStage } from "../lib/stages";
import { fetchContactsPage, ContactsApiError } from "../hooks/contacts-api";
import type { ContactsFilter, ContactsSort, CrmContact } from "../types";
import { StageDot, StageSelect } from "./stage-select";
import { TagChips } from "./tag-chips";

const PAGE = 50;

interface Props {
  workspaceId: string;
  filter: ContactsFilter;
  stage: ContactStage | null;
  onStageFilterChange: (stage: ContactStage | null) => void;
  sort: ContactsSort;
  onSortChange: (sort: ContactsSort) => void;
  counts: Record<ContactStage, number> | null;
  canEdit: boolean;
  persistStage: (contact: CrmContact, stage: ContactStage) => Promise<boolean>;
  onMigrationMissing: (message: string) => void;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; contacts: CrmContact[]; total: number };

export function ContactsList({
  workspaceId,
  filter,
  stage,
  onStageFilterChange,
  sort,
  onSortChange,
  counts,
  canEdit,
  persistStage,
  onMigrationMissing,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const request = useRef(0);

  const load = useCallback(
    async (at: number) => {
      const id = ++request.current;
      setState({ status: "loading" });
      try {
        const page = await fetchContactsPage(workspaceId, {
          ...filter,
          stage,
          sort,
          offset: at,
          limit: PAGE,
        });
        if (id === request.current) setState({ status: "ready", ...page });
      } catch (err) {
        if (id !== request.current) return;
        if (err instanceof ContactsApiError && err.migrationMissing) onMigrationMissing(err.message);
        setState({ status: "error" });
      }
    },
    [workspaceId, filter, stage, sort, onMigrationMissing],
  );

  // A new filter or order starts again at the first page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: a new filter goes back to page 1 and refetches
    setOffset(0);
    void load(0);
  }, [load]);

  function goTo(next: number) {
    setOffset(next);
    void load(next);
  }

  async function changeStage(contact: CrmContact, to: ContactStage) {
    if (state.status !== "ready") return;
    const replace = (s: ContactStage) =>
      setState((st) =>
        st.status === "ready"
          ? { ...st, contacts: st.contacts.map((c) => (c.id === contact.id ? { ...c, stage: s } : c)) }
          : st,
      );
    replace(to);
    if (!(await persistStage(contact, to))) replace(contact.stage);
  }

  const total = state.status === "ready" ? state.total : 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);
  const allCount = counts ? CONTACT_STAGES.reduce((n, s) => n + counts[s], 0) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={stage ?? "all"}
          onValueChange={(v) => onStageFilterChange(v === "all" ? null : (v as ContactStage))}
        >
          <SelectTrigger className="h-9 w-56" aria-label="Filtrar por etapa">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas las etapas{allCount !== null ? ` (${allCount.toLocaleString("es")})` : ""}
            </SelectItem>
            {CONTACT_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
                {counts ? ` (${counts[s].toLocaleString("es")})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.status === "ready" && total > 0 && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {from.toLocaleString("es")}–{to.toLocaleString("es")} de {total.toLocaleString("es")}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="hidden md:table-cell">Etiquetas</TableHead>
              <TableHead className="hidden lg:table-cell">Último mensaje</TableHead>
              <TableHead aria-sort={sort === "recent" ? "descending" : "ascending"}>
                <button
                  type="button"
                  onClick={() => onSortChange(sort === "recent" ? "oldest" : "recent")}
                  className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Última actividad
                  {sort === "recent" ? (
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {sort === "recent" ? "(más reciente primero)" : "(más antigua primero)"}
                  </span>
                </button>
              </TableHead>
              <TableHead className="w-16">
                <span className="sr-only">Conversación</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.status === "loading" &&
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, j) => (
                    <TableCell key={j} className={j === 2 ? "hidden md:table-cell" : j === 3 ? "hidden lg:table-cell" : ""}>
                      <div className="h-4 w-full max-w-32 animate-pulse rounded bg-primary/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {state.status === "error" && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">No se pudieron cargar los contactos.</p>
                  <Button size="sm" variant="outline" onClick={() => void load(offset)}>
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {state.status === "ready" && state.contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No hay contactos en esta vista.
                </TableCell>
              </TableRow>
            )}

            {state.status === "ready" &&
              state.contacts.map((c) => {
                const name = contactDisplayName(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="h-14 max-w-[14rem]">
                      <p className="truncate font-medium text-foreground" title={name}>
                        {name}
                      </p>
                      {name !== c.phone && (
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{c.phone}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <StageSelect
                          value={c.stage}
                          onChange={(s) => void changeStage(c, s)}
                          label={`Etapa de ${name}`}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <StageDot stage={c.stage} />
                          {STAGE_LABELS[c.stage]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <TagChips tags={c.tags} max={4} />
                    </TableCell>
                    <TableCell className="hidden max-w-[22rem] lg:table-cell">
                      <p className="truncate text-xs text-muted-foreground">{lastMessagePreview(c.lastMessage, 120)}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <time dateTime={c.lastActivityAt} title={new Date(c.lastActivityAt).toLocaleString("es")}>
                        {relativeTime(c.lastActivityAt)}
                      </time>
                    </TableCell>
                    <TableCell>
                      {c.conversationId && (
                        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Link href={`/inbox/${c.conversationId}`} aria-label={`Abrir la conversación con ${name}`}>
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {state.status === "ready" && total > PAGE && (
        <nav className="flex items-center justify-end gap-2" aria-label="Páginas">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(Math.max(0, offset - PAGE))}
            disabled={offset === 0}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(offset + PAGE)}
            disabled={offset + PAGE >= total}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
