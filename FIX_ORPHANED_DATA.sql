-- Supabase SQL Editor'a yapıştırılacak kod
UPDATE expenses 
SET project_id = (SELECT id FROM projects WHERE slug = 'huseyin-dinc' LIMIT 1)
WHERE project_id NOT IN (SELECT id FROM projects);

UPDATE checks 
SET project_id = (SELECT id FROM projects WHERE slug = 'huseyin-dinc' LIMIT 1)
WHERE project_id NOT IN (SELECT id FROM projects);

UPDATE apartments 
SET project_id = (SELECT id FROM projects WHERE slug = 'huseyin-dinc' LIMIT 1)
WHERE project_id NOT IN (SELECT id FROM projects);
