# 🏗️ İnşaat Yönetim Sistemi - Kullanım ve Kurulum Rehberi

Bu rehber, uygulamanın kurulumu, veritabanı yapılandırması ve genel kullanımı hakkında bilgiler içerir.

## 🚀 Hızlı Başlangıç (Supabase)

Bu proje veritabanı ve kimlik doğrulama için **Supabase** kullanmaktadır.

### 1. Veritabanı Yapılandırması
Supabase Dashboard üzerinden **SQL Editor**'e gidin ve `database/` klasöründeki SQL dosyalarını sırayla çalıştırın veya şu temel komutu uygulayın:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_code TEXT UNIQUE;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS plan_files JSONB DEFAULT '[]';
UPDATE projects SET public_code = gen_random_uuid()::text WHERE public_code IS NULL;
```

### 2. Depolama (Storage) Ayarları
Daire planlarını yükleyebilmeniz için bir "Storage Bucket" oluşturmanız gerekmektedir:
- **Bucket Adı:** `apartment-plans`
- **Erişim:** `Public` (Açık)

### 3. Çevresel Değişkenler (.env)
`.env` dosyanıza Supabase bilgilerinizi ekleyin:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📱 Uygulama Kullanımı

### 🏗️ Projeler
- Yeni projeler oluşturabilir, ortakları ve pay oranlarını belirleyebilirsiniz.
- Projeleri sildiğinizde bağlı tüm gider ve daireler de silinir (Dikkatli olun!).

### 💰 Giderler ve Gider Kalemleri
- Hem genel bir **Giderler** sayfasından tüm harcamaları görebilir hem de proje detayından o projeye özel harcamaları yönetebilirsiniz.
- Giderleri düzenleyebilir ve silebilirsiniz.

### 💳 Çek Yönetimi
- Projeye özel çekler ekleyebilir, vade ve ödeme durumlarını takip edebilirsiniz.

### 🏢 Daire ve Satış Yönetimi
- **Kat Planı Oluştur:** Binanızın kat ve daire yapısını hızlıca oluşturur.
- **Satış Kaydı:** Daireleri satıldı olarak işaretleyebilir, müşteri bilgilerini ve ödeme detaylarını girebilirsiniz.
- **Karekod (QR):** Daireler sekmesinden projenize özel karekodu alabilir, binaya asarak müşterilerin güncel durumu görmesini sağlayabilirsiniz.

---

## 🛠️ Geliştirici Notları

### Tasarım İlkeleri
- Uygulama **Kompakt Tasarım** prensibiyle geliştirilmiştir. Boşluklar minimize edilmiş, ekran alanı verimli kullanılmıştır.
- Tüm sistem **React + Vite + Supabase** tabanlıdır.

### Deployment (Vercel)
Değişiklikleri Vercel'de görmek için:
1. Değişiklikleri pushlayın.
2. Vercel Dashboard üzerinden projenizi seçin.
3. Environment variables'ların güncel olduğundan emin olun.
