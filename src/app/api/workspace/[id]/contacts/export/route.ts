/**
 * GET /api/workspace/[id]/contacts/export — CSV con los contactos del filtro
 * actual (?q=&tags=&stage=&sort=), hasta 10.000 filas. Cualquier miembro
 * activo exporta lo que ya puede ver.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as svcClient } from "@supabase/supabase-js";
import { requireWorkspaceMember } from "@/lib/auth/workspace-access";
import { parseContactsQuery } from "@/features/contacts/lib/query-params";
import { contactsToCsv, csvFilename } from "@/features/contacts/lib/csv";
import {
  listContactsForExport,
  MIGRATION_MISSING_MESSAGE,
} from "@/features/contacts/services/contacts-query";

const MAX_EXPORT_ROWS = 10_000;

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
  const { q, tags, stage, sort } = query.value;
  const result = await listContactsForExport(db, workspaceId, { q, tags, stage, sort }, MAX_EXPORT_ROWS);
  if (!result.ok) {
    return result.reason === "migration_missing"
      ? NextResponse.json({ error: MIGRATION_MISSING_MESSAGE, code: "migration_missing" }, { status: 503 })
      : NextResponse.json({ error: "No se pudo exportar" }, { status: 500 });
  }

  return new NextResponse(contactsToCsv(result.data.contacts), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename()}"`,
      "Cache-Control": "no-store",
      ...(result.data.truncated ? { "X-Export-Truncated": String(MAX_EXPORT_ROWS) } : {}),
    },
  });
}
