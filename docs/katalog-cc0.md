# Ücretsiz mobilya kataloğu

120 Kenney Furniture Kit modeli, renkli WebP önizlemeleriyle yerel olarak eklendi.
Kaynak ve CC0 lisansı `apps/plan-editor/public/items/kenney/SOURCE.md` ve
`LICENSE.txt` dosyalarında bulunur. Coohom varlıkları kullanılmadı.

Mobilya panelindeki Kütüphane seçimi tüm modelleri, mevcut arşivi veya Kenney
modellerini gösterir. Adlar Türkçe ve İngilizce aranabilir. Renkli 3D görünüm
düğmesi dokuları açar. Eski arşivde görünen kartlar için model malzemelerinden
önizleme üretilir; yükleme başarısızsa mevcut küçük resim korunur.

İçe aktarma: `node scripts/import-kenney-furniture.mjs <kaynak-checkout>`.
Ölçüler dönüştürülmüş model sınırlarından hesaplanır; üretici ölçüsü değildir.
Bu değişiklik veritabanı şemasını veya mevcut proje kayıtlarını değiştirmez.

Doğrulama: 16 editör/varlık/dil/yedekleme testi ve kök TypeScript kontrolü geçti.
120 modelin GLB yapısı, gömülü kaynakları, önizlemesi ve ölçüleri doğrulandı.
Eski kataloğun renkli önizlemeleri tarayıcıda örnek kategorilerde kontrol edildi.
Yeni 120 modelin tamamının etkileşimli yerleştirme kontrolü henüz tamamlanmadı.

## Kişisel kütüphane

Mobilya panelinde `Kendi kütüphanem · Ekle / Sil` açılır. PNG/JPG/WebP
bir düz görsel olarak, gömülü GLB/GLTF statik 3D model olarak eklenir.
Görsel için metre cinsinden genişlik ve derinlik seçilir. Dosya sınırı 10 MB,
görsel sınırı 16 megapikseldir. Harici dosyaya bağımlı GLTF reddedilir.

Kütüphane bu tarayıcının IndexedDB alanında saklanır; cihazlar arasında
senkronize edilmez. Yerleştirilmiş öğe kendi gömülü modelini taşır; arşivden
silmek çizimdeki kopyayı silmez. Büyük gömülü modeller çizim JSON yedeğini
büyütür; mevcut 20 MB içe aktarma sınırı geçerlidir.

Editör derlemesi ve 10 mevcut regresyon testi geçti. Dosya seçimi ve yerleştirme
akışının bu sürümde tarayıcı üzerinden uçtan uca kontrolü henüz yapılmadı.

## 2026-11-07 tarayıcı kontrolü

Ayrı yerel QA çiziminde GLB ve WebP yükleme, modelin 3D yerleştirilmesi,
görselin 2D yerleştirilmesi, yenilemede kayıtların korunması, arşivden kaldırma
ve son kaldırmayı geri alma doğrulandı. Üretim kayıtlarına test verisi eklenmedi.

Bulunan hatalar düzeltildi: GLB data adresinin şema tarafından reddedilmesi,
veri adresine CDN öneki eklenmesi, zorunlu küçük resmin eksikliği ve görsel kartında
boş kaynakla önizleme erişimi. Gömülü GLB için dar MIME/base64 doğrulaması eklendi;
HTML, javascript ve file adreslerinin reddi regresyon testiyle korunuyor.
Silme onayı panel içindedir. Son silmeyi geri al seçeneği panel açık kaldığı sürece
kullanılabilir; yenilemeden sonra geri alma belleği sıfırlanır.
