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
