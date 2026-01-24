# 🚀 HIZLI BAŞLANGIÇ REHBERİ

## Adım 1: Firebase Projesi Oluştur

1. **Firebase Console'a git**: https://console.firebase.google.com
2. **"Proje ekle"** veya **"Add project"** butonuna tıkla
3. **Proje adı gir**: `ferdibrahim-insaat` (veya istediğin bir isim)
4. **Google Analytics**: İstersen aktif et, istemezsen devre dışı bırak
5. **"Proje oluştur"** butonuna tıkla ve bekle (30 saniye kadar sürer)

---

## Adım 2: Authentication (Kimlik Doğrulama) Aktif Et

1. Sol menüden **"Build"** > **"Authentication"** seç
2. **"Get started"** butonuna tıkla
3. **"Sign-in method"** sekmesine geç
4. **"Email/Password"** satırına tıkla
5. **"Enable"** (Etkinleştir) anahtarını aç
6. **"Save"** (Kaydet) butonuna tıkla

✅ Kimlik doğrulama hazır!

---

## Adım 3: Firestore Database Oluştur

1. Sol menüden **"Build"** > **"Firestore Database"** seç
2. **"Create database"** butonuna tıkla
3. **"Start in production mode"** seç (güvenlik kurallarını sonra ayarlayacağız)
4. **Location seç**: `eur3 (europe-west)` (Avrupa sunucusu)
5. **"Enable"** butonuna tıkla ve bekle

✅ Veritabanı hazır!

---

## Adım 4: Güvenlik Kurallarını Ayarla

1. Firestore Database sayfasında **"Rules"** sekmesine geç
2. Aşağıdaki kuralları **kopyala ve yapıştır**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **"Publish"** (Yayınla) butonuna tıkla

✅ Sadece giriş yapmış kullanıcılar veri okuyup yazabilir!

---

## Adım 5: Firebase Config Bilgilerini Al

1. Sol üst köşedeki **⚙️ (Ayarlar)** ikonuna tıkla
2. **"Project settings"** (Proje ayarları) seç
3. Aşağı kaydır, **"Your apps"** bölümünü bul
4. **Web ikonu** `</>` tıkla
5. **App nickname**: `Web App` yaz
6. **"Register app"** tıkla
7. **Firebase config** bilgilerini göreceksin:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "ferdibrahim-insaat.firebaseapp.com",
  projectId: "ferdibrahim-insaat",
  storageBucket: "ferdibrahim-insaat.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. Bu bilgileri **kopyala** (bir yere yapıştır)

---

## Adım 6: .env Dosyasını Düzenle

1. Proje klasöründe `.env` dosyasını aç
2. Firebase'den aldığın bilgileri şu şekilde yapıştır:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=ferdibrahim-insaat.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ferdibrahim-insaat
VITE_FIREBASE_STORAGE_BUCKET=ferdibrahim-insaat.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

3. **Kaydet** (Ctrl+S)

---

## Adım 7: Uygulamayı Başlat

### Yöntem 1: Batch Dosyası (Kolay)
1. `start-preview.bat` dosyasına **çift tıkla**
2. Terminal açılacak, build yapılacak
3. Tarayıcında `http://localhost:3000` aç

### Yöntem 2: Manuel
1. Terminal aç (PowerShell)
2. Proje klasörüne git:
   ```bash
   cd c:\Users\surface11\Documents\GitHub\İnşaat\ferdibrahim-app
   ```
3. Build yap:
   ```bash
   node node_modules\vite\bin\vite.js build
   ```
4. Preview başlat:
   ```bash
   node node_modules\vite\bin\vite.js preview --port 3000
   ```
5. Tarayıcında `http://localhost:3000` aç

---

## Adım 8: İlk Kullanıcıyı Oluştur

1. Tarayıcıda **"Kayıt Ol"** linkine tıkla
2. **Email** ve **Şifre** gir (şifre en az 6 karakter)
3. **"Kayıt Ol"** butonuna tıkla
4. Otomatik olarak **Dashboard**'a yönlendirileceksin

🎉 **Tebrikler! Sistem hazır!**

---

## 📱 Kullanım

### Harcama Ekle
1. Sol menüden **"Harcamalar"** tıkla
2. **"+ Yeni Harcama"** butonuna tıkla
3. Kategori, açıklama, tutar ve tarih gir
4. **"Kaydet"** tıkla

### Çek Ekle
1. Sol menüden **"Çekler"** tıkla
2. **"+ Yeni Çek"** butonuna tıkla
3. Alıcı, tutar, tarih, çek no ve durum gir
4. **"Kaydet"** tıkla

### Daire Ekle
1. Sol menüden **"Daireler"** tıkla
2. **"+ Yeni Daire"** butonuna tıkla
3. Bina, daire no, kat, m², fiyat ve durum gir
4. Eğer satıldıysa müşteri bilgilerini de gir
5. **"Kaydet"** tıkla

---

## 🔧 Sorun Giderme

### "Firebase config hatası" alıyorum
- `.env` dosyasındaki bilgileri kontrol et
- Tüm satırların `VITE_` ile başladığından emin ol
- Uygulamayı yeniden başlat

### Giriş yapamıyorum
- Firebase Console'da Authentication'ın aktif olduğunu kontrol et
- Email/Password metodunun açık olduğunu kontrol et

### Veri kaydetmiyor
- Firestore Database'in oluşturulduğunu kontrol et
- Security Rules'un yayınlandığını kontrol et

---

## 🌐 Vercel'e Deploy (Opsiyonel)

1. GitHub'da yeni repository oluştur
2. Kodu push et:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/kullanici-adin/repo-adin.git
   git push -u origin main
   ```
3. https://vercel.com adresine git
4. GitHub ile giriş yap
5. Repository'ni seç
6. Environment Variables ekle (Firebase config)
7. Deploy et!

---

## 📞 Yardım

Herhangi bir sorun olursa:
1. Terminal'deki hata mesajlarını oku
2. Browser Console'u kontrol et (F12)
3. Firebase Console'da Authentication ve Firestore'un aktif olduğunu doğrula

**Başarılar! 🚀**
