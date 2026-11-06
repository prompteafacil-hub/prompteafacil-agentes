// Lee workspaces.settings para el modo prueba por workspace (ver test-mode.ts).
// Aparte del motor de decisión para que sus pruebas lo puedan reemplazar.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * settings del workspace, o null si no existe. Si la lectura falla, lanza: el
 * lote se reintenta en vez de responderle a todos porque no se pudo leer la
 * lista de prueba.
 */
export async function loadWorkspaceSettings(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    throw new Error(`[test-mode] workspace settings read failed: ${error.code ?? error.message}`);
  }
  return (data as { settings?: unknown } | null)?.settings ?? null;
}
