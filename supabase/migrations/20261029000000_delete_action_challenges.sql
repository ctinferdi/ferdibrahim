BEGIN;

-- Short-lived, server-only records for email-confirmed destructive actions.
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
REVOKE ALL ON TABLE public.delete_action_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.delete_action_challenges TO service_role;

COMMIT;
