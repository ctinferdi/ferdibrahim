ALTER TABLE checks ADD COLUMN IF NOT EXISTS last_notified_at TEXT;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS notified_milestones TEXT[] DEFAULT '{}';
