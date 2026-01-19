-- Add public_code column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_code TEXT UNIQUE;

-- Add plan_files column to apartments table
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS plan_files JSONB DEFAULT '[]';

-- Generate public codes for existing projects (UUID v4)
UPDATE projects 
SET public_code = gen_random_uuid()::text 
WHERE public_code IS NULL;

-- Create index for faster public_code lookups
CREATE INDEX IF NOT EXISTS idx_projects_public_code ON projects(public_code);
