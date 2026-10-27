BEGIN;

-- Private per-address cooldown used by request-password-reset.
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
    address_hash text PRIMARY KEY,
    last_requested_at timestamptz NOT NULL
);

ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_reset_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.password_reset_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS password_reset_rate_limits_requested_at_idx
    ON public.password_reset_rate_limits (last_requested_at);

CREATE OR REPLACE FUNCTION public.claim_password_reset_slot(
    p_address_hash text,
    p_cooldown_seconds integer DEFAULT 600
)
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

COMMIT;
