// Quién puede ver y editar Contactos. Todos los miembros activos ven; mover
// etapas lo pueden admin, manager y agent (como la ficha del inbox y la RLS
// "ws operators update contacts"); el viewer solo lee.

import type { WorkspaceRole } from "@/lib/auth/workspace-access";

export function canEditContacts(role: string | null | undefined): boolean {
  return role === "admin" || role === "manager" || role === "agent";
}

export function isWorkspaceRole(role: unknown): role is WorkspaceRole {
  return role === "admin" || role === "manager" || role === "agent" || role === "viewer";
}
