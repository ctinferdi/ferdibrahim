-- Add new columns to projects table
DO $$
BEGIN
    -- Add slug column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'slug') THEN
        ALTER TABLE projects ADD COLUMN slug text UNIQUE;
    END IF;

    -- Add public_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'public_code') THEN
        ALTER TABLE projects ADD COLUMN public_code text UNIQUE;
    END IF;

    -- Add company info columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_name') THEN
        ALTER TABLE projects ADD COLUMN company_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_address') THEN
        ALTER TABLE projects ADD COLUMN company_address text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'company_location') THEN
        ALTER TABLE projects ADD COLUMN company_location text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'whatsapp_number') THEN
        ALTER TABLE projects ADD COLUMN whatsapp_number text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'notification_emails') THEN
        ALTER TABLE projects ADD COLUMN notification_emails text[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'expense_categories') THEN
        ALTER TABLE projects ADD COLUMN expense_categories text[] NOT NULL DEFAULT ARRAY[]::text[];
    END IF;
END $$;

-- Short-lived server-side challenges for destructive-action email confirmations.
CREATE TABLE IF NOT EXISTS public.delete_action_challenges (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    target_id text NOT NULL,
    project_id uuid,
    code_hash text NOT NULL,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delete_action_challenges_user_created_idx
    ON public.delete_action_challenges (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS delete_action_challenges_one_pending_per_user_idx
    ON public.delete_action_challenges (user_id)
    WHERE used_at IS NULL;

ALTER TABLE public.delete_action_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delete_action_challenges FROM anon, authenticated;
GRANT ALL ON TABLE public.delete_action_challenges TO service_role;

-- Server-only, per-address cooldown for public password-reset requests.
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
    address_hash text PRIMARY KEY,
    last_requested_at timestamptz NOT NULL
);
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.password_reset_rate_limits TO service_role;
CREATE INDEX IF NOT EXISTS password_reset_rate_limits_requested_at_idx
    ON public.password_reset_rate_limits (last_requested_at);

CREATE OR REPLACE FUNCTION public.claim_password_reset_slot(p_address_hash text, p_cooldown_seconds integer DEFAULT 600)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    claimed boolean := false;
BEGIN
    IF p_address_hash IS NULL OR length(p_address_hash) < 32 OR length(p_address_hash) > 128 THEN
        RETURN false;
    END IF;

    INSERT INTO public.password_reset_rate_limits (address_hash, last_requested_at)
    VALUES (p_address_hash, now())
    ON CONFLICT (address_hash) DO UPDATE
        SET last_requested_at = now()
        WHERE public.password_reset_rate_limits.last_requested_at <= now() - make_interval(secs => greatest(60, least(p_cooldown_seconds, 3600)))
    RETURNING true INTO claimed;

    RETURN COALESCE(claimed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_password_reset_slot(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_password_reset_slot(text, integer) TO service_role;

-- Per-account cooldown for the metered floor-plan analysis function.
CREATE TABLE IF NOT EXISTS public.ai_analysis_rate_limits (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_requested_at timestamptz NOT NULL
);
ALTER TABLE public.ai_analysis_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_analysis_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.ai_analysis_rate_limits TO service_role;
CREATE INDEX IF NOT EXISTS ai_analysis_rate_limits_requested_at_idx
    ON public.ai_analysis_rate_limits (last_requested_at);

CREATE OR REPLACE FUNCTION public.claim_ai_analysis_slot(p_user_id uuid, p_cooldown_seconds integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    claimed boolean := false;
BEGIN
    IF p_user_id IS NULL THEN RETURN false; END IF;
    INSERT INTO public.ai_analysis_rate_limits (user_id, last_requested_at)
    VALUES (p_user_id, now())
    ON CONFLICT (user_id) DO UPDATE
        SET last_requested_at = now()
        WHERE public.ai_analysis_rate_limits.last_requested_at <= now() - make_interval(secs => greatest(30, least(p_cooldown_seconds, 3600)))
    RETURNING true INTO claimed;
    RETURN COALESCE(claimed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_ai_analysis_slot(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_analysis_slot(uuid, integer) TO service_role;

-- Prevent direct use of the legacy client-facing user deletion RPC. User removal
-- is now performed by the administrator-only admin-delete-user Edge Function.
DO $$
DECLARE
    delete_function record;
BEGIN
    FOR delete_function IN
        SELECT p.oid::regprocedure AS signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'delete_user_by_id'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', delete_function.signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', delete_function.signature);
    END LOOP;
END $$;

-- Add new columns to checks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'notification_email') THEN
        ALTER TABLE checks ADD COLUMN notification_email text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'notification_email_2') THEN
        ALTER TABLE checks ADD COLUMN notification_email_2 text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'notification_email_3') THEN
        ALTER TABLE checks ADD COLUMN notification_email_3 text;
    END IF;
END $$;
