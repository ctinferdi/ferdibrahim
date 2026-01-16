# İnşaat Finansal Yönetim Sistemi

Modern, çoklu kullanıcılı inşaat finansal yönetim web uygulaması.

## Özellikler

- 🔐 Email/Şifre ile güvenli giriş
- 👥 Çoklu kullanıcı desteği
- 💰 Harcama kalemleri takibi
- 💳 Çek yönetimi
- 🏢 Daire satış takibi
- 📊 Dashboard ve raporlama
- 📱 Mobil uyumlu, modern tasarım
- ☁️ Firebase ile gerçek zamanlı veri senkronizasyonu

## Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Firebase Yapılandırması
- Firebase Console'da yeni bir proje oluşturun (https://console.firebase.google.com)
- Authentication'ı etkinleştirin (Email/Password metodu)
- Firestore Database oluşturun
- Project Settings > General'dan Firebase config bilgilerinizi kopyalayın

`.env` dosyası oluşturun:
```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

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
5. Environment Variables bölümüne Firebase config bilgilerinizi ekleyin
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
- Firebase (Auth + Firestore)
- React Router
- CSS (Custom Design System)

## Lisans

Private
