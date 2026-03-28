-- ==========================================
-- 1. FIX EXPENSES TABLE (ADD MISSING COLUMNS)
-- ==========================================

-- Add missing columns to expenses table individually
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'partner_id') THEN
        ALTER TABLE expenses ADD COLUMN partner_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_method') THEN
        ALTER TABLE expenses ADD COLUMN payment_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'recipient') THEN
        ALTER TABLE expenses ADD COLUMN recipient TEXT;
    END IF;
END $$;


-- ==========================================
-- 2. CREATE NOTES TABLE (FOR QUICK NOTES)
-- ==========================================

CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can manage their own notes') THEN
        CREATE POLICY "Users can manage their own notes"
            ON notes
            FOR ALL
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create index for notes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
