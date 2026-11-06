-- Migration: 20261106000000_crm_contacts_board
-- Lectura de la página Contactos (CRM): tablero por etapa y lista.
--
-- Una fila por contacto del workspace con su última actividad (el último
-- mensaje de su conversación más reciente; sin conversación, la fecha de alta)
-- y la vista previa del último mensaje que no sea una nota interna. Filtra por
-- etapa, texto (nombre o teléfono) y etiquetas (al menos una de las pedidas),
-- y pagina: nunca devuelve más de 500 filas por llamada.
--
-- Solo service_role ejecuta, como get_insights: el caller
-- (src/features/contacts/services/contacts-query.ts) verifica la membresía
-- antes de llamar, y cada tabla se filtra por p_workspace_id.
--
-- La vista previa sale del índice idx_messages_conversation
-- (conversation_id, created_at DESC) y se calcula solo para la página pedida.

-- ¿El contacto coincide con la búsqueda y las etiquetas? Una sola expresión:
-- Postgres la inlinea en la consulta que la usa.
CREATE OR REPLACE FUNCTION public.crm_contact_matches(
  p_name TEXT,
  p_phone TEXT,
  p_tags TEXT[],
  p_search TEXT,
  p_filter_tags TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    (COALESCE(cardinality(p_filter_tags), 0) = 0 OR p_tags && p_filter_tags)
    AND (
      NULLIF(btrim(COALESCE(p_search, '')), '') IS NULL
      OR COALESCE(p_name, '') ILIKE
           '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      OR (
        regexp_replace(p_search, '\D', '', 'g') <> ''
        AND regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')
              LIKE '%' || regexp_replace(p_search, '\D', '', 'g') || '%'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_list_contacts(
  p_workspace_id UUID,
  p_stage public.contact_stage DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_sort TEXT DEFAULT 'recent',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  phone TEXT,
  name TEXT,
  email TEXT,
  stage public.contact_stage,
  tags TEXT[],
  opt_in BOOLEAN,
  created_at TIMESTAMPTZ,
  conversation_id UUID,
  last_activity_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_direction public.message_direction,
  last_message_type public.message_type,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
WITH filtered AS (
  SELECT c.id, c.phone, c.name, c.email, c.stage, c.tags, c.opt_in, c.created_at,
         conv.id AS conversation_id,
         COALESCE(conv.last_message_at, c.created_at) AS last_activity_at
    FROM public.contacts c
    LEFT JOIN LATERAL (
      SELECT v.id, v.last_message_at
        FROM public.conversations v
       WHERE v.contact_id = c.id
         AND v.workspace_id = p_workspace_id
       ORDER BY v.last_message_at DESC NULLS LAST
       LIMIT 1
    ) conv ON true
   WHERE c.workspace_id = p_workspace_id
     AND (p_stage IS NULL OR c.stage = p_stage)
     AND public.crm_contact_matches(c.name, c.phone, c.tags, p_search, p_tags)
),
page AS (
  SELECT f.*,
         count(*) OVER () AS total_count,
         row_number() OVER (
           ORDER BY
             CASE WHEN p_sort = 'oldest' THEN f.last_activity_at END ASC,
             CASE WHEN p_sort IS DISTINCT FROM 'oldest' THEN f.last_activity_at END DESC,
             f.id
         ) AS rn
    FROM filtered f
)
SELECT p.id, p.phone, p.name, p.email, p.stage, p.tags, p.opt_in, p.created_at,
       p.conversation_id, p.last_activity_at,
       lm.body, lm.direction, lm.type,
       p.total_count
  FROM page p
  LEFT JOIN LATERAL (
    SELECT m.body, m.direction, m.type
      FROM public.messages m
     WHERE m.conversation_id = p.conversation_id
       AND m.workspace_id = p_workspace_id
       AND m.type <> 'system'
     ORDER BY m.created_at DESC
     LIMIT 1
  ) lm ON true
 WHERE p.rn > GREATEST(COALESCE(p_offset, 0), 0)
   AND p.rn <= GREATEST(COALESCE(p_offset, 0), 0) + LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500)
 ORDER BY p.rn;
$$;

-- Cuántos contactos hay en cada etapa con la misma búsqueda y etiquetas (los
-- contadores de las columnas del tablero). Las etapas sin contactos no salen.
CREATE OR REPLACE FUNCTION public.crm_stage_counts(
  p_workspace_id UUID,
  p_search TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (stage public.contact_stage, total BIGINT)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT c.stage, count(*)
    FROM public.contacts c
   WHERE c.workspace_id = p_workspace_id
     AND public.crm_contact_matches(c.name, c.phone, c.tags, p_search, p_tags)
   GROUP BY c.stage;
$$;

REVOKE ALL ON FUNCTION public.crm_contact_matches(TEXT, TEXT, TEXT[], TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_list_contacts(UUID, public.contact_stage, TEXT, TEXT[], TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_stage_counts(UUID, TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_contact_matches(TEXT, TEXT, TEXT[], TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_list_contacts(UUID, public.contact_stage, TEXT, TEXT[], TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_stage_counts(UUID, TEXT, TEXT[]) TO service_role;
