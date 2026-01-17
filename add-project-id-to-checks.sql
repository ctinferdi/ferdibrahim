-- Checks tablosuna project_id kolonu ekle
DO $$ 
BEGIN
    -- project_id kolonu yoksa ekle
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'checks' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE checks 
        ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'project_id column added to checks table';
    ELSE
        RAISE NOTICE 'project_id column already exists in checks table';
    END IF;
END $$;
