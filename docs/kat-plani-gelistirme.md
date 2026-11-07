# Kat Planı geliştirme kaydı

## Yüzeyin yanında düzenleme — 7 Kasım 2026

Duvarın yanındaki panel ortak seçim paneline dönüştürüldü. Oda/döşeme seçildiğinde parke, fayans ve mermer küçük resimleri çizim alanındaki panelde gösterilir; oda kaplaması zone.floor.finish üzerinden değiştirilir. Mobilya, kapı, pencere ve diğer seçili elemanların mevcut özellikleri aynı panelde “Özellikleri göster” ile açılır. Fareyle başka aracın üstünden geçmek seçimi değiştirmez. 2D panel geometriyi yakınlaştırma/kaydırma sırasında takip eder; 3D panel tıklanan konuma yakın açılır. Panel yüksekliği görünümle sınırlıdır ve içeriği kaydırılabilir.

Ayrı localhost test çiziminde 2D kare fayans seçimi, 3D parke seçimi, yenileme sonrası kaplamanın korunması ve mobilyanın en/yükseklik/derinlik paneli kontrol edildi. Yayın öncesi 24 testin tamamı ve ana uygulama ile editörün tam üretim derlemesi geçti. Gerçek proje ve finansal kayıtlara test verisi yazılmadı. Büyük JavaScript paketi uyarısı devam ediyor. Seçim panelinin gizli görünümü referans alması engellendi; seçim yokken konum takip döngüsü çalıştırılmaz.

## Birlikte takip edilen işler — 7 Kasım 2026

Yeni istekler önceki işleri değiştirmez; aşağıdaki kapsam birlikte tamamlanacak. Bu bölüm tamamlanma veya yayın kaydı değildir.

- Renkli kuş bakışı tefriş: mobilya üst görünüşü, parke, duvar, kapı ve pencere ayrıntıları.
- Mobilyada en, derinlik ve yüksekliği bağımsız değiştirme; doğrudan çizim üzerindeki boyutlandırma tutamaçları ayrıca bekliyor.
- Duvarın son noktasından kesintisiz devam etmesi; Esc veya iptal ile durması.
- Kirişin serbest uzunluğu, duvarla hizalanması ve mevcut kirişin ölçülerinin düzenlenmesi.
- Kolon ve diğer yapı araçlarında doğru ölçü alanları, cm/m birimleri, Türkçe/İngilizce metinler; özelliklerin yalnızca kullanıcı istediğinde açılması.
- Kütüphaneye kullanıcı dosyası ekleme/kaldırma ve mevcut kayıtları koruma.

Mevcut yerel kontrolde renkli mobilya üst görünüşü, varsayılan parke, bağımsız en değişikliği ve 2D kesintisiz duvar çizimi gözlendi. 2D yerleştirme sorunu, gizlenen 3D Canvas içindeki araç yöneticisinin bağlanmamasından kaynaklanıyordu; gizli Canvas ölçülebilir tutulup render duraklatılarak düzeltildi. Ayrı test sahnesinde 3D'ye geçmeden kapı, pencere ve yatak yerleştirildi. Yatağın eni 108'den 180 cm'ye değiştirilirken yükseklik 60 cm ve derinlik 214 cm kaldı; yenileme sonrası kayıt korundu.

Duvarın 2D serbest kalınlık tutamaçları kaldırıldı. Coohom'daki seçili duvar paneli ve kalınlık listesi incelendi. Duvar seçildiğinde küçük “Seçili duvar” panelinde cm cinsinden kalınlık, hazır kalınlık seçenekleri ve yükseklik gösterilir; geçerli değerler anında seçili duvara uygulanır. Diğer ayrıntılar ve yüzey için “Özellikleri göster” kullanılır. Seçim varken yeni çizim ayarları gizlenir; böylece “Yeni duvar kalınlığı” ile mevcut duvarı düzenleme karışmaz. Katmanlı duvarlarda kalınlık değişimi mevcut katman oranlarını korur. Ayrı duvar testinde 10 ve 40 cm hazır seçeneklerinin geometrinin kalınlığını değiştirdiği, elle girilen 35 cm'nin yenileme sonrasında korunduğu görüldü. Önceki 300 cm yükseklik korundu. Dokuz hedefli test ve editör derlemesi geçti.

Bazı malzemeler henüz doku yerine renk gösteriyor. Mobilyanın çizim üzerinde sürükleyerek boyutlandırma tutamaçları ayrıca bekliyor. Finansal verilere test kaydı eklenmedi. Testler yalnızca ayrı localhost çalışma alanında yapılmalı.

## Referans ve öncelik

Kullanıcı Coohom'u referans gösterdi ve ilk önceliği **mobilya, malzeme ve gerçekçi 3D görünüm** olarak belirledi. Kullanıcının açtığı canlı Coohom editörü incelendi: solda oda/ürün kategorileri ve arama, ortada 2D/3D model, sağda seçilen öğe/kat özellikleri, ayrı render ve ışık ayarları. Coohom projesine nesne eklenmedi, kaynak veya katalog dosyaları kopyalanmadı.

Ürün açıklamaları:
- https://www.coohom.com/case/2d-floor-planner
- https://www.coohom.com/case/3d-floor-planner
- https://www.coohom.com/case/real-time-rendering

## Bu adım

- Aks: ad/numara, sabit uzunluk veya iki noktadan uzunluk; 2D'de kalıcı etiketli aks çizimi.
- Kiriş: uzunluk, en/yükseklik (cm), kat döşemesine göre alt kot (m); 2D çizimi ve 3D geometri.
- Yerleştirme için önce ölçüler girilir, Çizime başla ile 2D açılır, iki tıklamayla başlangıç/yön belirlenir. Esc taslağı iptal eder; tamamlanmış nesneleri silmez.
- Aks native `structural-grid`, kiriş native `block` olarak kaydedilir. Metadata `insaatKind` ile uygulamanın temsilini belirtir. Mevcut sahnelerin node türleri veya kimlikleri dönüştürülmez.
- Mobilya kütüphanesinin mevcut kategori/arama/yerleştirme altyapısı korunur.
- Ayrı Malzemeler paneli mevcut malzeme boyama ve özel malzeme altyapısını açar.
- Ayrı 3D Görünüm paneli sade/ışıklı görünüm, dokular, gölgeler, ortam teması, duvar kesiti ve kenar çizgilerini yönetir. Gerçekçi önizleme bir tarayıcı önizlemesidir; Coohom'un bulut render hizmetine bağlı değildir.
- Türkçe / English seçimi editörün üst çubuğundadır; tercih tarayıcıda tutulur. Native editörde locale API bulunmadığından bilinen sabit arayüz metinleri için DOM kimliğini koruyan bir çeviri adaptörü kullanılır. Proje adı `data-i18n-skip` ile korunur; input değerleri ve SVG içindeki kullanıcı verileri değiştirilmez. Yeni araç/pencerelerin sabit metinleri `src/translations.ts` sözlüğüne eklenir. İngilizce özel ürün/model adları ve henüz sözlükte bulunmayan gelişmiş panel metinleri özgün halleriyle kalır.
- 101 arşiv içi model yerel katalogdan sunulur. Yayınlanmış katalogdaki KTX2/thumbnail yolları arşivde bulunan gerçek dosyalara eşlenir. Karşılığı bulunmayan uzak modeller listelenmez; eksik doku haritaları 404 üretmek yerine malzemenin taban değerlerine bırakılır.

## Devam edecek işler

1. Mobilya kataloğunun Türkçe oda/ürün adları, arama ve model boyutu deneyimini iyileştirmek.
2. Malzeme seçimi, doku ölçeği/yönü ve seçili yüzey özelliklerini daha görünür yapmak.
3. Sunum akışını kamera önizlemeleri ve gelişmiş render seçenekleriyle geliştirmek.
4. Gereksinim netleştirilince sunucuda render, bulut çizim kaydı ve paylaşım için ayrı tasarım yapmak.
5. Coohom canlı render panelinde görülen en-boy oranları, 1K/2K/4K çıktılar, kayıtlı kamera açıları, çevre ve ışık düzenleme akışlarını geliştirmek. İnceleme sırasında render üretimi veya kredi kullanımı başlatılmadı.

## Veri sınırı ve kontroller

Çizimler hâlâ tarayıcıdaki ayrı IndexedDB veritabanında, kullanıcı/proje anahtarıyla tutulur. Mali kayıtlara/veritabanı şemasına yazılmaz. JSON yedeği ve yenileme sonrası sahne korunumu kontrol edilmelidir. Test çizimleri sadece localhost'taki `structural-qa` çalışma alanında oluşturulur.

`node --test tests/editor-integration.test.mjs tests/structural-tools.test.mjs`

Testler santimetre/metre dönüşümü, kiriş yönü ve merkezi, sabit/serbest uzunluk, geçersiz boyutlar, native node JSON korunumu, önceki kayıt korumaları ve yedek doğrulamasını kapsar.

## Kamera ve görsel çıktı — 31 Ekim 2026

- Yeni Kamera ve görsel çıktı paneli: adlandırılmış kamera açılarını kaydetme, açma ve onayla kaldırma. Her proje için en fazla 50 açı; kamera verileri ayrı IndexedDB deposunda atomik olarak tutulur. Çizim ve finansal veri tablolarına yazılmaz.
- Açı kayıtları bu tarayıcı/cihaza özeldir; mevcut JSON çizim yedeğine dahil değildir. Cihazlar arası senkronizasyon henüz yoktur.
- Güncel 3D kameradan yatay/dikey/kare çıktı: 16:9, 9:16, 4:3, 1:1; uzun kenar 1280, 1920 veya 3840 piksel. Oluşan görsel panelde önizlenir, indirme ayrı düğmedir. Kullanıcının canlı kamera veya ekran boyutu değiştirilmez.
- Native ephemeral görüntü yakalama yolunda gereksiz host thumbnail-storage callback zorunluluğu kaldırıldı. Kalıcı thumbnail akışı callback olmadan yine hata verir; görüntü hataları/tamamlanma requestId ile ayrılır.
- Bu bir yerel 3D render çıktısıdır; Coohom bulut render hizmeti değildir.
- 14 test, ana uygulama TypeScript kontrolü ve üretim derlemesi geçti. Ayrı local QA sahnesinde kamera kaydı yenileme sonrasında korundu; 1920×1080 ve 2160×3840 çıktılar, Türkçe/English paneli tarayıcıdan doğrulandı. Üretim verisiyle test kaydı oluşturulmadı.

## Sağlamlaştırma denetimi — 1 Kasım 2026

- Kamera açıları artık çizim JSON yedeğine dahil. Eski açı deposu silinmeden çizim kaydına taşınır; eski yalnız-sahne yedekleri mevcut açıları korur.
- Sahne ve kamera içe aktarması tek IndexedDB işlemiyle yapılır. İçe aktarmayı geri alma, her ikisinin önceki halini korur. Geri alma öncesinde bekleyen sahne değişiklikleri kaydedilir.
- Aynı sekmenin otomatik/elle kayıt istekleri sıraya alındı; farklı sekmelerin sürüm çakışması koruması devam ediyor. Başka çalışma alanına yanlışlıkla kayıt reddedilir.
- Proje seçimine dön düğmesi iframe kayıt yanıtını bekler; hata veya zaman aşımında çizimi açık tutar.
- Bölünmüş 2D/3D görünümde görsel çıktı etkin. WebP çıktı doğru uzantıyla indirilir.
- Aks/kiriş çiziminde Boşluk ile kaydırma ve giriş alanlarında Esc davranışı düzeltildi.
- Telefon araç menüsü yatay kaydırılabilir; 390 px ekranda düğmeler 80 px, sayfa taşması yok. Duvar özelliklerinin Türkçe metinleri genişletildi.
- 15 otomatik test; ana uygulama TypeScript kontrolü ve üretim derlemesi geçti. Mevcut local QA kamera kaydı ve dil geçişleri tarayıcıdan kontrol edildi.
- Finansal kayıtlara ve Supabase şemasına yazılmadı. Çizimler hâlâ cihazda saklanır. Bulut senkronizasyonu, bulut render ve gelişmiş panellerin kalan çevirileri sonraki geliştirmelerdir. Editörün büyük JavaScript paketi uyarısı devam eder; ana uygulamadan ayrı yüklenir.
# 7 Kasım 2026 — Zemin kaplaması ve duvar yanında ölçüler

- Seçili duvarın kalınlık/yükseklik paneli 2D'de duvarın yanında açılır; pan ve zoom ile konumunu takip eder. 3D'de aynı alanlar sol panelde kalır.
- Oda/zemin seçimi için görselli parke, fayans ve mermer seçenekleri eklendi. Odanın kaplaması `zone.floor.finish` üzerinde saklanır; paylaşılan döşemenin tamamına yazılmaz. Bağımsız döşemeler kendi yüzey slotunu kullanır.
- 2D kaplamalar döşemenin dış sınırına ve boşluklarına kırpılır; 3D ile aynı malzeme referanslarını kullanır.
- Yerel ayrı test çizimlerinde fayansın 2D görünümü, mermerin 2D/3D görünümü ve yenileme sonrası saklanması doğrulandı. Duvarın hazır 40 cm kalınlığı ve zoom sırasında panel takibi kontrol edildi. Üretim proje/gider verileri değiştirilmedi.
- Editör build başarılı; 9 ilgili otomatik test geçti. Büyük JavaScript paket uyarısı sürüyor. Yerel sunucu 3014 portunda açık; bu değişiklikler henüz push edilmedi.
