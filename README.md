# İnşaat Finansal Yönetim Sistemi

Modern, çoklu kullanıcılı inşaat finansal yönetim web uygulaması.

## Özellikler

- 🔐 Email/Şifre ile güvenli giriş
- 👥 Çoklu kullanıcı desteği
- 💰 Harcama kalemleri takibi
- 💳 Çek yönetimi
- 🏢 Daire satış takibi
- 📊 Dashboard ve raporlama
- 🧱 Elle 2D kat planı çizimi; duvar, kapı, pencere ve mobilya yerleşimi
- 📏 Seçili duvarlarda uzunluk, kalınlık ve yükseklik düzenleme
- 🏢 3D orbit görünümü ve daire içi gezinti
- 📐 Pascal tabanlı bağımsız 2D/3D editör; proje bazlı yerel kayıt ve JSON yedeği
- 📱 Mobil uyumlu, modern tasarım
- ☁️ Supabase ile gerçek zamanlı veri senkronizasyonu

## Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
npm run install:editor
```

### 2. Supabase ve Gemini Yapılandırması
- Supabase projesi oluşturun; Auth ve veritabanını etkinleştirin.
- Google AI Studio'dan Gemini API anahtarı alın.

`.env` dosyası oluşturun:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

`GEMINI_API_KEY` yalnızca sunucu tarafında kullanılır; adını `VITE_` ile başlatmayın. Yerelde AI istekleri Vite API ara katmanından, Vercel dağıtımında `/api/analyze-building` fonksiyonundan geçer. Vercel ortam değişkenlerine `GEMINI_API_KEY` ekleyin.

Yeni kat planı editörü apps/plan-editor/ altında, ana React uygulamasından bağımsız derlenir. Kaynak ve lisans bilgileri için bu klasördeki README dosyasına bakın. Çizimler yalnızca seçilen kullanıcı/proje anahtarıyla cihazda saklanır; Supabase finansal tablolarını değiştirmez. Bina analizi aracı ise /api/analyze-building üzerinden çalışmaya devam eder.

### 3. Geliştirme Sunucusunu Başlat
```bash
npm run dev
# Ayrı terminalde:
npm run dev:editor
```

Uygulama http://localhost:3000 adresinde açılacaktır.

## Deployment (Vercel)

1. Vercel hesabı oluşturun (https://vercel.com)
2. GitHub'a projeyi yükleyin
3. Vercel dashboard'da "New Project" tıklayın
4. Repository'nizi seçin
5. Environment Variables bölümüne Supabase URL/Anon Key ve sunucu tarafı `GEMINI_API_KEY` ekleyin
6. Deploy edin

Custom domain için Vercel dashboard'da Settings > Domains bölümüne ferdibrahim.com domain'inizi ekleyin.

## Kullanım

1. Yönetici tarafından Ayarlar bölümünde oluşturulan hesabınızla giriş yapın
2. Giriş yapın
3. Dashboard'dan genel durumu görüntüleyin
4. Harcamalar, Çekler ve Daireler sayfalarından veri eklemeye başlayın

## Teknolojiler

- React 18 + TypeScript
- Vite
- Supabase (Auth + Postgres + Storage + Edge Functions)
- React Router
- CSS (Custom Design System)

## Lisans

Private
