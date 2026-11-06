"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { contactDisplayName, lastMessagePreview, relativeTime } from "../lib/format";
import type { ContactStage } from "../lib/stages";
import type { CrmContact } from "../types";
import { StageSelect } from "./stage-select";
import { TagChips } from "./tag-chips";

interface Props {
  contact: CrmContact;
  canEdit: boolean;
  isDragging?: boolean;
  onStageChange: (contact: CrmContact, stage: ContactStage) => void;
  onDragStart?: (contact: CrmContact) => void;
  onDragEnd?: () => void;
}

export function ContactCard({
  contact,
  canEdit,
  isDragging = false,
  onStageChange,
  onDragStart,
  onDragEnd,
}: Props) {
  const name = contactDisplayName(contact);
  const hasName = name !== contact.phone;
  const preview = lastMessagePreview(contact.lastMessage);

  return (
    <article
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", contact.id);
        onDragStart?.(contact);
      }}
      onDragEnd={onDragEnd}
      aria-label={name}
      className={cn(
        "group space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm",
        "transition-[opacity,border-color,box-shadow] duration-150",
        canEdit && "cursor-grab active:cursor-grabbing hover:border-border",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground" title={name}>
            {name}
          </p>
          {hasName && (
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {contact.phone}
            </p>
          )}
        </div>
        <time
          dateTime={contact.lastActivityAt}
          className="shrink-0 text-[11px] text-muted-foreground"
          title={new Date(contact.lastActivityAt).toLocaleString("es")}
        >
          {relativeTime(contact.lastActivityAt)}
        </time>
      </div>

      {preview && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
      )}

      <TagChips tags={contact.tags} />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <StageSelect
          value={contact.stage}
          onChange={(stage) => onStageChange(contact, stage)}
          label={`Etapa de ${name}`}
          disabled={!canEdit}
        />
        {contact.conversationId ? (
          <Link
            href={`/inbox/${contact.conversationId}`}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Abrir la conversación con ${name}`}
            draggable={false}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Chat</span>
          </Link>
        ) : (
          <span className="text-[11px] text-muted-foreground">Sin conversación</span>
        )}
      </div>
    </article>
  );
}

export function ContactCardSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3" aria-hidden="true">
      <div className="flex justify-between gap-2">
        <div className="h-4 w-28 animate-pulse rounded bg-primary/10" />
        <div className="h-3 w-10 animate-pulse rounded bg-primary/10" />
      </div>
      <div className="h-3 w-full animate-pulse rounded bg-primary/10" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-primary/10" />
      <div className="h-6 w-24 animate-pulse rounded bg-primary/10" />
    </div>
  );
}
