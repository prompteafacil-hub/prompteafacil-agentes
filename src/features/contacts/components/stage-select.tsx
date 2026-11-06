"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CONTACT_STAGES, STAGE_LABELS, type ContactStage } from "../lib/stages";

/** Color del punto de cada etapa (tokens del design system). */
export const STAGE_DOT: Record<ContactStage, string> = {
  new: "bg-muted-foreground",
  engaged: "bg-info",
  qualified: "bg-primary",
  customer: "bg-success",
  lost: "bg-destructive",
};

export function StageDot({ stage, className }: { stage: ContactStage; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", STAGE_DOT[stage], className)}
    />
  );
}

interface Props {
  value: ContactStage;
  onChange: (stage: ContactStage) => void;
  /** Para el lector de pantalla: "Etapa de Ana". */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Cambiar la etapa sin arrastrar (teclado, lector de pantalla, celular). */
export function StageSelect({ value, onChange, label, disabled, className }: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ContactStage)}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={label}
        className={cn("h-7 w-auto gap-1.5 px-2 text-xs", className)}
      >
        <StageDot stage={value} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTACT_STAGES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STAGE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
