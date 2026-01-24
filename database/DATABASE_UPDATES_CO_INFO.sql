-- Add notification email to checks table
ALTER TABLE checks ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Add company and notification info to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_emails TEXT[] DEFAULT '{}';

-- Optional: ensure the array doesn't exceed 3 elements (this can be enforced in frontend, 
-- but if we want a constraint we'd use a check constraint)
-- ALTER TABLE users ADD CONSTRAINT check_notification_emails_limit CHECK (array_length(notification_emails, 1) <= 3);
