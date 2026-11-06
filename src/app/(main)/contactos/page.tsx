import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getActiveWorkspace,
} from "@/features/workspace/services/active-workspace";
import { ContactsPage } from "@/features/contacts/components/contacts-page";
import { canEditContacts } from "@/features/contacts/services/contacts-auth";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Same entry rules as the inbox: an agency super admin picks a client first.
  const { data: userRow } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  const activeCookie = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (userRow?.is_super_admin && !activeCookie) redirect("/workspaces");

  const membership = await getActiveWorkspace(supabase, user.id);
  if (!membership) {
    if (userRow?.is_super_admin) redirect("/workspaces");
    redirect("/onboarding");
  }

  const canEdit = canEditContacts(membership.role);

  return (
    <main className="mx-auto max-w-[96rem] space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Contactos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canEdit
            ? "Tu embudo de WhatsApp: arrastra un contacto o elige su etapa para moverlo."
            : "Tu embudo de WhatsApp por etapa."}
        </p>
      </div>
      <Suspense>
        <ContactsPage
          workspaceId={membership.workspace_id}
          canEdit={canEdit}
        />
      </Suspense>
    </main>
  );
}
