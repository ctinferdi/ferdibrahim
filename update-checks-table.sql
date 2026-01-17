-- Çekler tablosunu Excel yapısına uygun hale getir
-- Öncelikle eski tablo varsa ve yapısı çok farklıysa sütunları ekle/değiştir

DO $$ 
BEGIN
    -- Mevcut sütunları kontrol et ve yeni alanları ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'company') THEN
        ALTER TABLE checks ADD COLUMN company TEXT;
        -- Eğer recipient varsa veriyi taşı
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'recipient') THEN
            UPDATE checks SET company = recipient;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'category') THEN
        ALTER TABLE checks ADD COLUMN category TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'vat_status') THEN
        ALTER TABLE checks ADD COLUMN vat_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'issuer') THEN
        ALTER TABLE checks ADD COLUMN issuer TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'given_date') THEN
        ALTER TABLE checks ADD COLUMN given_date DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'description') THEN
        ALTER TABLE checks ADD COLUMN description TEXT;
    END IF;
END $$;

-- 'notes' veya 'aciklama' gibi eski sütunlar varsa silmek yerine şimdilik kalsın veya description'a taşıyabilirsin.
-- recipient sütununu silebiliriz artık
-- ALTER TABLE checks DROP COLUMN IF EXISTS recipient;
