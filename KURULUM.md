# Supabase Kurulum - En Kolay Yol

Kanka, telefondan zor oluyorsa şöyle yap:

## Yöntem 1: Bilgisayardan Yap (En Garantili)

Bilgisayara geçince 5 dakika sürer:

1. **Supabase'e gir:** https://supabase.com/dashboard
2. **SQL Editor** → **New Query** → Şu kodu yapıştır:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_code TEXT UNIQUE;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS plan_files JSONB DEFAULT '[]';
UPDATE projects SET public_code = gen_random_uuid()::text WHERE public_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_public_code ON projects(public_code);
```

3. **Run** bas
4. **Storage** → **Create bucket** → İsim: `apartment-plans`, Public: ✅
5. Bitti!

---

## Yöntem 2: Telefondan Yap

Supabase mobil uygulaması yok ama tarayıcıdan yapabilirsin:

1. Telefonda Chrome/Safari aç
2. https://supabase.com/dashboard
3. Desktop site görünümüne geç
4. Yukarıdaki adımları takip et

---

## Yöntem 3: Şimdilik Atla

Migration olmadan da çalışır ama:
- Yeni projeler için karekod oluşmaz
- Daire planı yükleyemezsin

Bilgisayara geçince halledersin, acele yok! 😊

---

**npm install'ı da bilgisayardan yap:**
```
npm install qrcode.react
```

Şimdilik kodlar hazır, istediğin zaman kurarsın kanka! 🚀
