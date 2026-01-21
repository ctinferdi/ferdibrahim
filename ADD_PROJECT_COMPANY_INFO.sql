-- Add company info columns to projects table for project-specific information
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
