/**
 * PUT /api/workspace/[id]/test-mode — números de prueba de ESTE workspace.
 *
 * Con lista, la IA solo responde a esos números en este workspace (manda sobre
 * AI_TEST_NUMBERS). Lista vacía = sin lista propia: vuelve a mandar la
 * variable global, si existe. Solo un admin del workspace guarda.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as svcClient } from "@supabase/supabase-js";
import { readJsonBody, requireWorkspaceMember } from "@/lib/auth/workspace-access";
import {
  MAX_WORKSPACE_TEST_NUMBERS,
  normalizeTestNumbersInput,
  withTestNumbers,
} from "@/features/test-mode/lib/workspace-test-mode";

const BodySchema = z.object({ numbers: z.string().max(2000) });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  const auth = await requireWorkspaceMember(workspaceId, { minRole: "admin" });
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = BodySchema.safeParse(body.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { numbers, invalid } = normalizeTestNumbersInput(parsed.data.numbers);
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Revisa estos números: ${invalid.slice(0, 3).join(", ")}` },
      { status: 422 },
    );
  }
  if (numbers.length > MAX_WORKSPACE_TEST_NUMBERS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_WORKSPACE_TEST_NUMBERS} números de prueba` },
      { status: 422 },
    );
  }

  const svc = svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: row, error: readError } = await svc
    .from("workspaces")
    .select("settings")
    .eq("id", workspaceId)
    .maybeSingle();
  if (readError || !row) {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  const settings = withTestNumbers((row as { settings: unknown }).settings, numbers);
  const { error } = await svc
    .from("workspaces")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
  if (error) {
    console.error("[test-mode] update failed:", error.code);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, numbers });
}
