"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Columns3, Download, List, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateContact } from "@/features/inbox/services/contact-actions";
import { isContactStage, STAGE_LABELS, type ContactStage } from "../lib/stages";
import { parseTagsParam } from "../lib/query-params";
import { exportCsvHref, fetchContactsSummary, ContactsApiError } from "../hooks/contacts-api";
import type { ContactsFilter, ContactsSort, ContactsSummary, CrmContact } from "../types";
import { ContactsBoard } from "./contacts-board";
import { ContactsList } from "./contacts-list";
import { TagFilter } from "./tag-filter";

type View = "tablero" | "lista";

interface Props {
  workspaceId: string;
  canEdit: boolean;
}

export function ContactsPage({ workspaceId, canEdit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // The URL keeps the view and filters, so a reload or a shared link opens the same thing.
  const [view, setView] = useState<View>(params.get("vista") === "lista" ? "lista" : "tablero");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [q, setQ] = useState(search.trim());
  const [tags, setTags] = useState<string[]>(() => parseTagsParam(params.getAll("tags")));
  const [stage, setStage] = useState<ContactStage | null>(() => {
    const s = params.get("etapa");
    return isContactStage(s) ? s : null;
  });
  const [sort, setSort] = useState<ContactsSort>(params.get("orden") === "antiguos" ? "oldest" : "recent");
  const [summary, setSummary] = useState<ContactsSummary | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  // Typing waits 300 ms before searching.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filter = useMemo<ContactsFilter>(() => ({ q, tags }), [q, tags]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (view === "lista") sp.set("vista", "lista");
    if (q) sp.set("q", q);
    for (const t of tags) sp.append("tags", t);
    if (view === "lista" && stage) sp.set("etapa", stage);
    if (view === "lista" && sort === "oldest") sp.set("orden", "antiguos");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [view, q, tags, stage, sort, pathname, router]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryFailed(false);
      setSummary(await fetchContactsSummary(workspaceId, filter));
    } catch (err) {
      if (err instanceof ContactsApiError && err.migrationMissing) setMigrationMessage(err.message);
      setSummaryFailed(true);
    }
  }, [workspaceId, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: loadSummary resets its error before each (re)fetch
    void loadSummary();
  }, [loadSummary]);

  const persistStage = useCallback(
    async (contact: CrmContact, to: ContactStage): Promise<boolean> => {
      const res = await updateContact(contact.id, { stage: to });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cambiar la etapa");
        return false;
      }
      setSummary((s) =>
        s
          ? {
              ...s,
              counts: {
                ...s.counts,
                [contact.stage]: Math.max(0, s.counts[contact.stage] - 1),
                [to]: s.counts[to] + 1,
              },
            }
          : s,
      );
      toast.success(`Movido a ${STAGE_LABELS[to]}`);
      return true;
    },
    [],
  );

  const totalInView = summary ? Object.values(summary.counts).reduce((a, b) => a + b, 0) : null;
  const hasFilters = q !== "" || tags.length > 0;
  const workspaceEmpty = totalInView === 0 && !hasFilters;

  function clearFilters() {
    setSearch("");
    setQ("");
    setTags([]);
  }

  if (migrationMessage) {
    return (
      <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <p className="font-medium">La página de contactos todavía no está lista en esta instalación.</p>
        <p className="mt-1 text-muted-foreground">{migrationMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar contactos por nombre o teléfono"
            className="h-9 pl-8"
          />
        </div>

        <TagFilter available={summary?.availableTags ?? []} selected={tags} onChange={setTags} />

        <div className="ml-auto flex items-center gap-2">
          {view === "lista" && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <a href={exportCsvHref(workspaceId, { ...filter, stage, sort })} download>
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar CSV
              </a>
            </Button>
          )}
          <div className="inline-flex rounded-md border border-border/60 p-0.5" role="group" aria-label="Vista">
            {(
              [
                { id: "tablero", label: "Tablero", Icon: Columns3 },
                { id: "lista", label: "Lista", Icon: List },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  view === id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Etiquetas del filtro">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-foreground hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label={`Quitar la etiqueta ${tag} del filtro`}
              >
                {tag}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setTags([])}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Limpiar
            </button>
          </li>
        </ul>
      )}

      {summaryFailed && !summary && (
        <p className="text-xs text-muted-foreground">
          No se pudieron cargar las etiquetas.{" "}
          <button type="button" className="underline" onClick={() => void loadSummary()}>
            Reintentar
          </button>
        </p>
      )}

      {workspaceEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-16 text-center">
          <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Todavía no hay contactos</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Aparecen aquí en cuanto alguien le escribe al número de WhatsApp de este workspace.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/inbox">Ir al inbox</Link>
          </Button>
        </div>
      ) : totalInView === 0 && hasFilters ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-16 text-center">
          <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">Ningún contacto coincide</h2>
            <p className="mt-1 text-sm text-muted-foreground">Prueba con otro nombre, teléfono o etiqueta.</p>
          </div>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>
      ) : view === "tablero" ? (
        <ContactsBoard
          workspaceId={workspaceId}
          filter={filter}
          canEdit={canEdit}
          persistStage={persistStage}
          onMigrationMissing={setMigrationMessage}
        />
      ) : (
        <ContactsList
          workspaceId={workspaceId}
          filter={filter}
          stage={stage}
          onStageFilterChange={setStage}
          sort={sort}
          onSortChange={setSort}
          counts={summary?.counts ?? null}
          canEdit={canEdit}
          persistStage={persistStage}
          onMigrationMissing={setMigrationMessage}
        />
      )}
    </div>
  );
}
