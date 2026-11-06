/**
 * GET /api/workspace/[id]/contacts/summary — contadores por etapa (con la
 * misma búsqueda y etiquetas) y las etiquetas que existen en el workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as svcClient } from "@supabase/supabase-js";
import { requireWorkspaceMember } from "@/lib/auth/workspace-access";
import { parseContactsQuery } from "@/features/contacts/lib/query-params";
import {
  loadContactsSummary,
  MIGRATION_MISSING_MESSAGE,
} from "@/features/contacts/services/contacts-query";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  const auth = await requireWorkspaceMember(workspaceId);
  if (!auth.ok) return auth.response;

  const query = parseContactsQuery(req.nextUrl.searchParams);
  if (!query.ok) return NextResponse.json({ error: query.error }, { status: 400 });

  const db = svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const result = await loadContactsSummary(db, workspaceId, query.value);
  if (!result.ok) {
    return result.reason === "migration_missing"
      ? NextResponse.json({ error: MIGRATION_MISSING_MESSAGE, code: "migration_missing" }, { status: 503 })
      : NextResponse.json({ error: "No se pudieron cargar los contadores" }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
