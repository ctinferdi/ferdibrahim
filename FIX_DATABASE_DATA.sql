-- Orphaned Data Recovery Script
-- This script fixes the issue where 155 expenses/checks are attached to a deleted/hidden project ID.
-- It moves all orphaned data to the active "HÜSEYİN DİNÇ" project.

DO $$
DECLARE
  active_project_id uuid;
BEGIN
  -- Get the active project ID for huseyin-dinc
  SELECT id INTO active_project_id FROM projects WHERE slug = 'huseyin-dinc' LIMIT 1;
  
  IF active_project_id IS NOT NULL THEN
    -- Move orphaned expenses
    UPDATE expenses 
    SET project_id = active_project_id 
    WHERE project_id != active_project_id;
    
    -- Move orphaned checks
    UPDATE checks 
    SET project_id = active_project_id 
    WHERE project_id != active_project_id;
    
    -- Move orphaned apartments
    UPDATE apartments 
    SET project_id = active_project_id 
    WHERE project_id != active_project_id;
    
    RAISE NOTICE 'Orphaned data moved to %', active_project_id;
  ELSE
    RAISE NOTICE 'Active project not found';
  END IF;
END $$;
