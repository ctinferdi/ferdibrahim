-- Önce varsa eski zamanlayıcıyı silelim:
SELECT cron.unschedule('check-notifier-daily');

-- Şimdi YENİ isim (smooth-endpoint) ile kuralım:
SELECT cron.schedule(
  'check-notifier-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bqwqwgcrnrtunwzyajzf.supabase.co/functions/v1/check-notifier',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd3F3Z2NybnJ0dW53enlhanpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTI4MTYsImV4cCI6MjA4NDA4ODgxNn0.PDSTe3R_utf0zu7pZkW_xHkqcgIhXilCRjZraTZUbqY"}'::jsonb,
    body := '{"time": "' || now() || '"}'::jsonb
  ) as request_id;
  $$
);

-- Not: Zamanlanmış görevleri görmek için:
-- SELECT * FROM cron.job;

-- Not: Geçmiş çalışmaları görmek için:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
