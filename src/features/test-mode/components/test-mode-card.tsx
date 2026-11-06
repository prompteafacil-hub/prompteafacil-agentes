"use client";

/**
 * Modo prueba de ESTE workspace: la IA solo responde a los números de la
 * lista. No afecta a los demás workspaces de la instalación.
 */

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface TestModeInitial {
  /** Números propios del workspace (vacío = sin lista propia). */
  numbers: string[];
  /** La instalación tiene AI_TEST_NUMBERS definido. */
  globalActive: boolean;
}

interface Props {
  workspaceId: string;
  canEdit: boolean;
  initial: TestModeInitial;
}

export function TestModeCard({ workspaceId, canEdit, initial }: Props) {
  const [enabled, setEnabled] = useState(initial.numbers.length > 0);
  const [text, setText] = useState(initial.numbers.join(", "));
  const [saved, setSaved] = useState(initial.numbers);
  const [saving, setSaving] = useState(false);

  async function save(numbersText: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/test-mode`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: numbersText }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        numbers?: string[];
        error?: string;
      };
      if (!res.ok || !json.numbers) {
        toast.error(json.error ?? "No se pudo guardar");
        return false;
      }
      setSaved(json.numbers);
      setText(json.numbers.join(", "));
      setEnabled(json.numbers.length > 0);
      toast.success(
        json.numbers.length > 0
          ? "Modo prueba activo en este workspace"
          : "Modo prueba del workspace desactivado",
      );
      return true;
    } catch {
      toast.error("Error de conexión");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function onToggle(next: boolean) {
    setEnabled(next);
    // Apagar guarda al instante; prender espera a que escribas los números.
    if (!next && saved.length > 0) void save("");
  }

  function onSave() {
    if (!text.trim()) {
      toast.error("Escribe al menos un número de prueba");
      return;
    }
    void save(text);
  }

  const status =
    saved.length > 0
      ? `Activo: la IA solo responde a ${saved.length === 1 ? "1 número" : `${saved.length} números`} en este workspace.`
      : initial.globalActive
        ? "Este workspace usa el modo prueba global de la instalación (AI_TEST_NUMBERS)."
        : "Apagado: la IA responde a todos los contactos.";

  return (
    <section className="space-y-3 rounded-md border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Modo prueba</h3>
            <p className="text-xs text-muted-foreground">
              La IA solo responde a los números que indiques, únicamente en este
              workspace. Los demás mensajes entran al inbox sin respuesta automática.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={!canEdit || saving}
          aria-label="Modo prueba"
        />
      </div>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="test-mode-numbers" className="text-xs">
            Números de prueba
          </Label>
          <Textarea
            id="test-mode-numbers"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="+5215512345678, +573001234567"
            rows={2}
            disabled={!canEdit || saving}
            className="font-mono text-xs"
            aria-describedby="test-mode-hint"
          />
          <p id="test-mode-hint" className="text-xs text-muted-foreground">
            Separados por coma, con código de país. Se comparan los últimos 10
            dígitos, así que da igual si incluyes el 9 de Argentina o el 1 de México.
          </p>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canEdit || saving}
            aria-busy={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Guardar números
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {status}
        {!canEdit && " Solo un admin del workspace puede cambiarlo."}
      </p>
    </section>
  );
}
