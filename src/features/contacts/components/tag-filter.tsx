"use client";

import { useState } from "react";
import { Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  available: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}

/** Filtro de etiquetas: muestra los contactos que tienen al menos una de las elegidas. */
export function TagFilter({ available, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" aria-label="Filtrar por etiquetas">
          <Tag className="h-4 w-4" aria-hidden="true" />
          Etiquetas
          {selected.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 font-mono text-[11px] text-primary-foreground">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar etiqueta…" />
          <CommandList>
            <CommandEmpty>
              {available.length === 0 ? "Todavía no hay etiquetas." : "Sin resultados."}
            </CommandEmpty>
            <CommandGroup>
              {available.map((tag) => {
                const isOn = selected.includes(tag);
                return (
                  <CommandItem key={tag} value={tag} onSelect={() => toggle(tag)} aria-selected={isOn}>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-border",
                        isOn && "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{tag}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <p className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            Muestra los contactos con al menos una de las etiquetas elegidas.
          </p>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
