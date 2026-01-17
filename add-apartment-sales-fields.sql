-- Daireler tablosuna yeni alanlar ekle
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS sold_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
