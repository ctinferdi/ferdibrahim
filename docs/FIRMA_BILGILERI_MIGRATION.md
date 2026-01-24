# Firma Bilgileri Migration - Supabase SQL

Bu SQL komutlarını Supabase Dashboard'da çalıştır.

## Adım 1: users Tablosuna Kolonlar Ekle

```sql
-- Firma bilgileri kolonlarını users tablosuna ekle
ALTER TABLE users
ADD COLUMN company_name TEXT,
ADD COLUMN company_address TEXT,
ADD COLUMN company_location TEXT,
ADD COLUMN whatsapp_number TEXT;
```

## Adım 2 (Opsiyonel): Mevcut Proje Bilgilerini Kopyala

Eğer zaten projects tablosunda firma bilgileri varsa, bunları users tablosuna kopyalayabiliriz:

```sql
-- İlk projedeki firma bilgilerini kullanıcıya kopyala
UPDATE users u
SET 
  company_name = p.company_name,
  company_address = p.company_address,
  company_location = p.company_location,
  whatsapp_number = p.whatsapp_number
FROM projects p
WHERE p.user_id = u.id
AND p.company_name IS NOT NULL
LIMIT 1;
```

## Adım 3 (İlerisi İçin): projects Tablosundan Kolonları Kaldır

**ŞİMDİLİK YAPMA!** Test ettikten sonra yapacağız:

```sql
-- BEKLE! Önce test et, sonra kaldır
-- ALTER TABLE projects
-- DROP COLUMN company_name,
-- DROP COLUMN company_address,
-- DROP COLUMN company_location,
-- DROP COLUMN whatsapp_number;
```

## Nasıl Çalıştırılır?

1. Supabase Dashboard → SQL Editor → New query
2. Yukarıdaki SQL'i yapıştır (Adım 1 ve 2)
3. **Run** butonu
4. ✅ Success mesajı gelmeli

## Doğrulama

```sql
-- users tablosunu kontrol et
SELECT id, email, company_name, whatsapp_number FROM users LIMIT 5;
```
