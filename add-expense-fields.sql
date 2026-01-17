-- Add project_id and partner_id to todos table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES project_partners(id) ON DELETE SET NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2);
ALTER TABLE todos ADD COLUMN IF NOT EXISTS expense_date DATE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes TEXT;

-- Rename if needed for clarity
COMMENT ON TABLE todos IS 'Stores expenses/transactions for projects';
