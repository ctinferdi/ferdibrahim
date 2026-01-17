-- Çekler tablosuna da e-posta takibi ekle
ALTER TABLE checks ADD COLUMN IF NOT EXISTS created_by_email TEXT;
