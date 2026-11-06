import type { ContactStage } from "../lib/stages";

/** Una fila de la página Contactos (crm_list_contacts). */
export interface CrmContact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  stage: ContactStage;
  tags: string[];
  optIn: boolean;
  createdAt: string;
  conversationId: string | null;
  lastActivityAt: string;
  lastMessage: {
    body: string | null;
    direction: "in" | "out";
    type: string;
  } | null;
}

export type ContactsSort = "recent" | "oldest";

export interface ContactsFilter {
  q: string;
  tags: string[];
}

export interface ContactsPage {
  contacts: CrmContact[];
  total: number;
}

export interface ContactsSummary {
  counts: Record<ContactStage, number>;
  availableTags: string[];
}
