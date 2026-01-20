# Supabase Storage Kurulum - HIZLI ÇÖZÜM

## Sorun
`400 Bad Request` hatası alıyorsun çünkü `apartment-plans` bucket'ı yok veya yapılandırılmamış.

## Çözüm

### 1. Supabase Dashboard'a Git
https://supabase.com/dashboard

### 2. Storage → Buckets
- **"Create a new bucket"** tıkla

### 3. Bucket Ayarları
```
Name: apartment-plans
Public bucket: ✅ AÇIK (çok önemli!)
File size limit: 50 MB
Allowed MIME types: (boş bırak - tümüne izin ver)
```

### 4. "Create bucket" tıkla

### 5. VEYA: SQL ile otomatik oluştur

```sql
-- SQL Editor'da çalıştır:

-- Bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('apartment-plans', 'apartment-plans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS politikaları (herkes okuyabilir, authenticated kullanıcılar yükleyebilir)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'apartment-plans' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'apartment-plans' );

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'apartment-plans' );

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'apartment-plans' );
```

### 6. Test Et
Dosya yüklemeyi tekrar dene!

---

## QR Kod Boş Sayfa İçin

Public sayfada console'da hata var mı kontrol et:
1. QR kod sayfasına git
2. F12 → Console
3. Kırmızı hata varsa söyle

🚀
