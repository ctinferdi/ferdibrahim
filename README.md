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
- ✨ İsteğe bağlı AI kat planı taslağı
- 📱 Mobil uyumlu, modern tasarım
- ☁️ Supabase ile gerçek zamanlı veri senkronizasyonu

## Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
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

`GEMINI_API_KEY` yalnızca sunucu tarafında kullanılır; adını `VITE_` ile başlatmayın. Yerelde AI istekleri Vite API ara katmanından, Vercel dağıtımında `/api/analyze-floorplan` fonksiyonundan geçer. Vercel ortam değişkenlerine `GEMINI_API_KEY` ekleyin.

Kat planı stüdyosunun ana akışı elle çizim ve düzenlemedir. 2D görünümde duvar çizin, duvar ölçülerini özellik çubuğundan düzenleyin, kapı/pencere yerleştirin ve mobilya kataloğunu kullanın; 3D görünümde modeli orbit veya iç mekân gezintisiyle inceleyin.

AI yalnızca isteğe bağlı yardımcıdır. Bu özelliği kullanmak için PDF, DXF, JPG, PNG veya WEBP plan yükleyip **AI Taslağı** düğmesine basın. AI düzenlenebilir bir öneri oluşturur; mevcut çizim ancak taslağı siz uyguladığınızda değişir. Manuel çizim için Gemini API anahtarı gerekmez.

### Kat Planı Stüdyosu Geliştirme Yönü

Stüdyo, mevcut proje yapısını koruyarak Revit esintili bir BIM iş akışına aşamalı büyütülecektir. Öncelik manuel çizim, hassas ölçülendirme, nesne özellikleri ve güvenli düzenleme geçmişidir. Sonraki yapı taşları kat seviyeleri, odalar, kolon/kiriş/döşeme araçları; ardından daha ayrıntılı 3D düzenleme ve proje alışveriş formatlarıdır. AI, ana çizim akışının yerine geçmez.

### 3. Geliştirme Sunucusunu Başlat
```bash
npm run dev
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

1. Kayıt Ol sayfasından ilk kullanıcı hesabınızı oluşturun
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
