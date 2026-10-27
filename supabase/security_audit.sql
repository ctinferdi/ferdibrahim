-- Read-only Supabase security review. Run in the SQL Editor; it does not alter data or settings.

-- 1) Row-level security status and active policies on application tables.
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_policies AS p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND c.relname IN (
      'users', 'projects', 'project_partners', 'project_images',
      'expenses', 'checks', 'apartments', 'notes',
      'delete_action_challenges', 'password_reset_rate_limits', 'ai_analysis_rate_limits'
  )
ORDER BY c.relname, p.policyname;

-- 2) Table grants for the public-facing API roles.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
      'users', 'projects', 'project_partners', 'project_images',
      'expenses', 'checks', 'apartments', 'notes',
      'delete_action_challenges', 'password_reset_rate_limits', 'ai_analysis_rate_limits'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- 3) Column grants can reveal whether public users can read private fields.
SELECT table_name, column_name, grantee, privilege_type
FROM information_schema.role_column_grants
WHERE table_schema = 'public'
  AND table_name IN ('users', 'projects', 'project_partners', 'project_images', 'apartments')
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, grantee, column_name, privilege_type;

-- 4) Public storage buckets and object policies.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'apartment-plans';

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
