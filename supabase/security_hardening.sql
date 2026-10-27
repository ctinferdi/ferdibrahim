-- Security hardening for the existing Supabase project.
-- This migration changes permissions and RLS policies only; it does not alter or delete rows.
-- Run only after reviewing the read-only report in security_audit.sql.
-- Deploy the signed-URL frontend before switching apartment-plans to Private in the dashboard.
-- Then switch the bucket to Private and run this migration; preflight aborts if it is still public.

BEGIN;

DO $$
DECLARE
    missing_tables text[];
BEGIN
    SELECT array_agg(required.name)
    INTO missing_tables
    FROM unnest(ARRAY[
        'users', 'projects', 'project_partners', 'project_images',
        'expenses', 'checks', 'apartments', 'notes'
    ]) AS required(name)
    WHERE to_regclass(format('public.%I', required.name)) IS NULL;

    IF missing_tables IS NOT NULL THEN
        RAISE EXCEPTION 'Security update stopped: required public tables are missing: %', missing_tables;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'accessible_projects'
          AND data_type = 'ARRAY'
          AND udt_name = '_uuid'
    ) THEN
        RAISE EXCEPTION 'Security update stopped: users.accessible_projects must be uuid[]';
    END IF;

    IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL
       OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'apartment-plans') THEN
        RAISE EXCEPTION 'Security update stopped: expected apartment-plans Supabase Storage bucket was not found';
    END IF;

    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'apartment-plans' AND public) THEN
        RAISE EXCEPTION 'Security update stopped: set apartment-plans to Private in the Supabase Storage dashboard before running this migration';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.app_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, auth
AS $$
    SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = 'ctinferdi@gmail.com'
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT p_project_id IS NOT NULL
       AND auth.uid() IS NOT NULL
       AND (
            public.app_is_super_admin()
            OR EXISTS (
                SELECT 1 FROM public.projects AS project_row
                WHERE project_row.id = p_project_id
                  AND project_row.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.users AS user_row
                WHERE user_row.id = auth.uid()
                  AND p_project_id = ANY(COALESCE(user_row.accessible_projects, ARRAY[]::uuid[]))
            )
       )
$$;

CREATE OR REPLACE FUNCTION public.app_can_manage_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT p_project_id IS NOT NULL
       AND auth.uid() IS NOT NULL
       AND (
            public.app_is_super_admin()
            OR EXISTS (
                SELECT 1 FROM public.projects AS project_row
                WHERE project_row.id = p_project_id
                  AND project_row.user_id = auth.uid()
            )
       )
$$;

CREATE OR REPLACE FUNCTION public.app_can_write_apartment(p_project_id uuid, p_row_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT public.app_can_access_project(p_project_id)
       AND (
            p_row_user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.projects AS project_row
                WHERE project_row.id = p_project_id
                  AND project_row.user_id = p_row_user_id
            )
       )
$$;

-- Storage paths are either {apartment UUID}/{file} or
-- project-images/{project UUID}/{file}. Never authorize arbitrary bucket paths.
CREATE OR REPLACE FUNCTION public.app_can_access_storage_object(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    path_parts text[] := string_to_array(COALESCE(p_name, ''), '/');
    target_id uuid;
BEGIN
    IF array_length(path_parts, 1) = 3 AND path_parts[1] = 'project-images' THEN
        IF path_parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RETURN false;
        END IF;
        target_id := path_parts[2]::uuid;
        RETURN public.app_can_access_project(target_id);
    END IF;

    IF array_length(path_parts, 1) = 2
       AND path_parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        target_id := path_parts[1]::uuid;
        RETURN EXISTS (
            SELECT 1
            FROM public.apartments AS apartment_row
            WHERE apartment_row.id = target_id
              AND public.app_can_access_project(apartment_row.project_id)
        );
    END IF;

    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_is_public_storage_object(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    path_parts text[] := string_to_array(COALESCE(p_name, ''), '/');
    target_id uuid;
BEGIN
    IF array_length(path_parts, 1) = 3 AND path_parts[1] = 'project-images' THEN
        IF path_parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RETURN false;
        END IF;
        target_id := path_parts[2]::uuid;
        RETURN EXISTS (
            SELECT 1
            FROM public.projects AS project_row
            WHERE project_row.id = target_id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        );
    END IF;

    IF array_length(path_parts, 1) = 2
       AND path_parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        target_id := path_parts[1]::uuid;
        RETURN EXISTS (
            SELECT 1
            FROM public.apartments AS apartment_row
            JOIN public.projects AS project_row ON project_row.id = apartment_row.project_id
            WHERE apartment_row.id = target_id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        );
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.app_is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_access_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_manage_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_write_apartment(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_access_storage_object(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_is_public_storage_object(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_write_apartment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_storage_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_public_storage_object(text) TO anon, authenticated;

-- Remove the broad policies shown by the audit and replace them with scoped rules.
DROP POLICY IF EXISTS "Giriş yapan düzenleyebilir" ON public.projects;
DROP POLICY IF EXISTS "Giriş yapan ekleyebilir" ON public.projects;
DROP POLICY IF EXISTS "Giriş yapan silebilir" ON public.projects;
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view authorized projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

DROP POLICY IF EXISTS "Apartments policy full" ON public.apartments;
DROP POLICY IF EXISTS "Giriş yapan düzenleyebilir" ON public.apartments;
DROP POLICY IF EXISTS "Giriş yapan ekleyebilir" ON public.apartments;
DROP POLICY IF EXISTS "Giriş yapan silebilir" ON public.apartments;
DROP POLICY IF EXISTS "Herkes okuyabilir" ON public.apartments;
DROP POLICY IF EXISTS "Users can delete their own apartments" ON public.apartments;
DROP POLICY IF EXISTS "Users can insert their own apartments" ON public.apartments;
DROP POLICY IF EXISTS "Users can update their own apartments" ON public.apartments;
DROP POLICY IF EXISTS "Users can view their own apartments" ON public.apartments;

DROP POLICY IF EXISTS "Checks policy full" ON public.checks;
DROP POLICY IF EXISTS "Users can delete their own checks" ON public.checks;
DROP POLICY IF EXISTS "Users can insert their own checks" ON public.checks;
DROP POLICY IF EXISTS "Users can update their own checks" ON public.checks;
DROP POLICY IF EXISTS "Users can view checks of authorized projects" ON public.checks;
DROP POLICY IF EXISTS "Users can view their own checks" ON public.checks;

DROP POLICY IF EXISTS "Expenses policy full" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses of authorized projects" ON public.expenses;
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;

DROP POLICY IF EXISTS "Auth users can manage project images" ON public.project_images;
DROP POLICY IF EXISTS "Public can view project images" ON public.project_images;
DROP POLICY IF EXISTS "Users can view project images of authorized projects" ON public.project_images;

DROP POLICY IF EXISTS "Authenticated Manage Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Project members can delete storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public can read published project storage objects" ON storage.objects;

DROP POLICY IF EXISTS "Users can delete partners of their projects" ON public.project_partners;
DROP POLICY IF EXISTS "Users can insert partners to their projects" ON public.project_partners;
DROP POLICY IF EXISTS "Users can update partners of their projects" ON public.project_partners;
DROP POLICY IF EXISTS "Users can view partners of authorized projects" ON public.project_partners;
DROP POLICY IF EXISTS "Users can view partners of their projects" ON public.project_partners;

DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.users;
DROP POLICY IF EXISTS "Super admin can update users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Public can view company details for published projects" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Users see only their profile; only the signed-in root administrator can manage user grants.
CREATE POLICY "Users can read their own profile"
    ON public.users FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.app_is_super_admin());
CREATE POLICY "Root administrator can update user access"
    ON public.users FOR UPDATE TO authenticated
    USING (public.app_is_super_admin())
    WITH CHECK (public.app_is_super_admin());
CREATE POLICY "Public can read company details for published projects"
    ON public.users FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.projects AS project_row
            WHERE project_row.user_id = users.id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        )
    );

-- Private project rows stay with their owner and explicitly authorized collaborators.
CREATE POLICY "Project members can read projects"
    ON public.projects FOR SELECT TO authenticated
    USING (public.app_can_access_project(id));
CREATE POLICY "Public can read published projects"
    ON public.projects FOR SELECT TO anon
    USING (public_code IS NOT NULL AND btrim(public_code) <> '');
CREATE POLICY "Users can create projects for themselves"
    ON public.projects FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.app_is_super_admin());
CREATE POLICY "Project members can update safe project fields"
    ON public.projects FOR UPDATE TO authenticated
    USING (public.app_can_access_project(id))
    WITH CHECK (public.app_can_access_project(id));
CREATE POLICY "Project owners and root can delete projects"
    ON public.projects FOR DELETE TO authenticated
    USING (public.app_can_manage_project(id));

-- Project partners are visible to members; only owners/root can change the partner list.
CREATE POLICY "Project members can read partners"
    ON public.project_partners FOR SELECT TO authenticated
    USING (public.app_can_access_project(project_id));
CREATE POLICY "Public can read partners of published projects"
    ON public.project_partners FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.projects AS project_row
            WHERE project_row.id = project_partners.project_id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        )
    );
CREATE POLICY "Project owners and root can add partners"
    ON public.project_partners FOR INSERT TO authenticated
    WITH CHECK (public.app_can_manage_project(project_id));
CREATE POLICY "Project owners and root can update partners"
    ON public.project_partners FOR UPDATE TO authenticated
    USING (public.app_can_manage_project(project_id))
    WITH CHECK (public.app_can_manage_project(project_id));
CREATE POLICY "Project owners and root can remove partners"
    ON public.project_partners FOR DELETE TO authenticated
    USING (public.app_can_manage_project(project_id));

-- Shared project data is available only to that project's members.
CREATE POLICY "Project members can read expenses"
    ON public.expenses FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());
CREATE POLICY "Users can add expenses to their own or shared projects"
    ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND (project_id IS NULL OR public.app_can_access_project(project_id))
    );
CREATE POLICY "Project members can update expenses"
    ON public.expenses FOR UPDATE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid())
    WITH CHECK (
        public.app_is_super_admin()
        OR (project_id IS NULL AND user_id = auth.uid())
        OR (project_id IS NOT NULL AND public.app_can_access_project(project_id))
    );
CREATE POLICY "Project members can remove expenses"
    ON public.expenses FOR DELETE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());

CREATE POLICY "Project members can read checks"
    ON public.checks FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());
CREATE POLICY "Users can add checks to their own or shared projects"
    ON public.checks FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND (project_id IS NULL OR public.app_can_access_project(project_id))
    );
CREATE POLICY "Project members can update checks"
    ON public.checks FOR UPDATE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid())
    WITH CHECK (
        public.app_is_super_admin()
        OR (project_id IS NULL AND user_id = auth.uid())
        OR (project_id IS NOT NULL AND public.app_can_access_project(project_id))
    );
CREATE POLICY "Project members can remove checks"
    ON public.checks FOR DELETE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());

CREATE POLICY "Project members can read apartments"
    ON public.apartments FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());
CREATE POLICY "Public can read apartments of published projects"
    ON public.apartments FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.projects AS project_row
            WHERE project_row.id = apartments.project_id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        )
    );
CREATE POLICY "Project members can add apartments"
    ON public.apartments FOR INSERT TO authenticated
    WITH CHECK (
        (project_id IS NULL AND user_id = auth.uid())
        OR public.app_can_write_apartment(project_id, user_id)
    );
CREATE POLICY "Project members can update apartments"
    ON public.apartments FOR UPDATE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid())
    WITH CHECK (
        (project_id IS NULL AND user_id = auth.uid())
        OR public.app_can_write_apartment(project_id, user_id)
    );
CREATE POLICY "Project members can remove apartments"
    ON public.apartments FOR DELETE TO authenticated
    USING (public.app_is_super_admin() OR public.app_can_access_project(project_id) OR user_id = auth.uid());

CREATE POLICY "Project members can read project images"
    ON public.project_images FOR SELECT TO authenticated
    USING (public.app_can_access_project(project_id));
CREATE POLICY "Project members can manage project images"
    ON public.project_images FOR ALL TO authenticated
    USING (public.app_can_access_project(project_id))
    WITH CHECK (public.app_can_access_project(project_id));
CREATE POLICY "Public can read images of published projects"
    ON public.project_images FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.projects AS project_row
            WHERE project_row.id = project_images.project_id
              AND project_row.public_code IS NOT NULL
              AND btrim(project_row.public_code) <> ''
        )
    );

CREATE POLICY "Users can manage their own notes"
    ON public.notes FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Public project pages use short-lived signed links. The bucket must already be
-- private in Supabase Storage settings; this migration only scopes object access.
CREATE POLICY "Project members can read storage objects"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'apartment-plans' AND public.app_can_access_storage_object(name));
CREATE POLICY "Public can read published project storage objects"
    ON storage.objects FOR SELECT TO anon
    USING (bucket_id = 'apartment-plans' AND public.app_is_public_storage_object(name));
CREATE POLICY "Project members can upload storage objects"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'apartment-plans' AND public.app_can_access_storage_object(name));
CREATE POLICY "Project members can update storage objects"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'apartment-plans' AND public.app_can_access_storage_object(name))
    WITH CHECK (bucket_id = 'apartment-plans' AND public.app_can_access_storage_object(name));
CREATE POLICY "Project members can delete storage objects"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'apartment-plans' AND public.app_can_access_storage_object(name));

-- Remove broad table grants, then grant only what each API role needs.
REVOKE ALL ON TABLE public.users, public.projects, public.project_partners,
    public.project_images, public.expenses, public.checks, public.apartments,
    public.notes
FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT, DELETE ON TABLE public.projects TO authenticated;
GRANT UPDATE (name, description, status, company_name, company_address,
    company_location, whatsapp_number, notification_emails, expense_categories)
ON TABLE public.projects TO authenticated;
GRANT INSERT (name, description, status, slug, public_code, company_name,
    company_address, company_location, whatsapp_number, notification_emails,
    expense_categories, user_id)
ON TABLE public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.apartments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated;

GRANT SELECT (id, company_name, company_address, company_location, whatsapp_number)
ON TABLE public.users TO anon;
GRANT SELECT (id, name, description, status, slug, public_code, company_name,
    company_address, company_location, whatsapp_number, user_id, created_at)
ON TABLE public.projects TO anon;
GRANT SELECT (id, project_id, name, share_percentage, created_at)
ON TABLE public.project_partners TO anon;
GRANT SELECT (id, project_id, url, name, created_at)
ON TABLE public.project_images TO anon;
GRANT SELECT (id, building_name, apartment_number, floor, square_meters, price,
    sold_price, currency, status, sort_order, plan_files, floor_plan_3d,
    project_id, created_at)
ON TABLE public.apartments TO anon;

COMMIT;
