# Public Code Atama - Kolay Yol

Kanka, Supabase migration çalışmadı. Şimdi public code'u manuel atayalım:

## Yöntem 1: Browser Console (En Kolay)

1. Proje sayfasını aç: http://localhost:3513/projeler
2. **F12** bas (Developer Tools)
3. **Console** tab'ına geç
4. Şu kodu yapıştır ve Enter:

```javascript
// Public code ata
async function fixPublicCode() {
    const projectId = '20fe84db-d3c0-46a7-b342-c519cd40fdee'; // HÜSEYİN DİNÇ
    const publicCode = crypto.randomUUID();
    
    const response = await fetch('https://YOUR_SUPABASE_URL/rest/v1/projects?id=eq.' + projectId, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'YOUR_SUPABASE_ANON_KEY',
            'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
        },
        body: JSON.stringify({ public_code: publicCode })
    });
    
    console.log('✅ Public code atandı:', publicCode);
    console.log('🔗 Public URL:', window.location.origin + '/projeler/' + publicCode + '/public');
}

fixPublicCode();
```

## Yöntem 2: Supabase Dashboard (Daha Kolay!)

1. https://supabase.com/dashboard → Proje seç
2. **Table Editor** → `projects` tablosu
3. "HÜSEYİN DİNÇ" projesini bul
4. `public_code` kolonuna tıkla
5. Şu kodu yapıştır: `abc123-test` (veya herhangi bir benzersiz kod)
6. Save

Sonra test et: http://localhost:3513/projeler/abc123-test/public

---

## Yöntem 3: SQL (En Garantili)

Supabase SQL Editor'da:

```sql
-- HÜSEYİN DİNÇ projesine kod ata
UPDATE projects 
SET public_code = 'huseyin-dinc-2024' 
WHERE name = 'HÜSEYİN DİNÇ';

-- Kontrol et
SELECT name, public_code FROM projects;
```

Test URL: http://localhost:3513/projeler/huseyin-dinc-2024/public

---

Hangisi kolay gelirse onu yap kanka! Sonra QR kod çalışacak 🚀
