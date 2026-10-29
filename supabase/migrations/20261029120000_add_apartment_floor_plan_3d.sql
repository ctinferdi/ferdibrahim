BEGIN;

-- The app persists the optional apartment-level 3D plan in this JSON column.
-- Adding it as nullable preserves every existing apartment record unchanged.
ALTER TABLE public.apartments
    ADD COLUMN IF NOT EXISTS floor_plan_3d jsonb;

COMMIT;
