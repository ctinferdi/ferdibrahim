export type Language = 'tr' | 'en';
const entries = `
Drawing|Çizim
Furniture|Mobilya
Materials|Malzemeler
3D Appearance|3D Görünüm
Levels|Katlar
Settings|Ayarlar
Plugins|Eklentiler
Building tools|Yapı araçları
Wall|Duvar
Door|Kapı
Window|Pencere
Slab|Döşeme
Ceiling|Tavan
Roof|Çatı
Stair|Merdiven
Column|Kolon
Rectangular room|Dikdörtgen oda
Polygon room|Çokgen oda
Axis|Aks
Beam|Kiriş
Axis dimensions|Aks ölçüleri
Beam dimensions|Kiriş ölçüleri
Name / number|Ad / numara
Use fixed length|Sabit uzunluk kullan
Length (m)|Uzunluk (m)
Width (cm)|En (cm)
Height (cm)|Yükseklik (cm)
Bottom elevation above level (m)|Alt kot — kat döşemesinden (m)
Start drawing|Çizime başla
Select a tool and draw in the canvas. Esc returns to selection.|Aracı seçip çizim alanında çalış. Esc ile seçim moduna dön.
Select start point|Başlangıç noktasını seç
Select end direction|Bitiş yönünü seç
Furniture library|Mobilya kütüphanesi
Choose an item from a category and place it in the plan. Edit its position and dimensions in the properties panel.|Kategoriden bir ürün seç, planda yerleştir. Seçtiğin ürünün konumunu ve boyutlarını özellikler panelinden düzenleyebilirsin.
Materials and finishes|Malzeme ve kaplamalar
Choose a finish and click a wall, floor or ceiling surface. Use + below to add a custom color or material.|Kaplamayı seçip duvar, zemin veya tavan yüzeyine tıkla. Özel renk ve malzeme eklemek için alttaki + düğmesini kullan.
Apply a finish in 3D|3D'de kaplama uygula
3D appearance and lighting|3D görünüm ve ışık
Fast working view|Hızlı çalışma
Realistic preview|Gerçekçi önizleme
View|Görünüm
Solid model|Sade model
Materials and lighting|Malzeme ve ışık
Lighting environment|Işık ortamı
Studio|Stüdyo
Soft daylight|Yumuşak gün ışığı
Sunset|Gün batımı
Warm daylight|Sıcak gün ışığı
Night|Gece
White presentation|Beyaz sunum
Twilight|Alacakaranlık
Nature|Doğa
Technical drawing|Teknik çizim
Material textures|Kaplama dokuları
Shadows|Gölgeler
Wall display|Duvar görünümü
Full walls|Tam duvar
Open interior|İç mekânı aç
Low walls|Alçak duvar
Translucent walls|Saydam duvar
Edge lines|Kenar çizgileri
Off|Kapalı
Soft|Yumuşak
Strong|Belirgin
Realistic preview enables materials, textures and shadows. Use Fast working view for smoother editing in large projects.|Gerçekçi önizleme malzemeleri, dokuları ve gölgeleri açar. Büyük projelerde akıcı çizim için Hızlı çalışma'yı kullan.
Download JSON backup|JSON yedeği indir
Open backup|Yedeği aç
Undo backup import|İçe aktarmayı geri al
Loading…|Yükleniyor…
Ready|Hazır
Unsaved changes|Değişiklik var
Saving…|Kaydediliyor…
Saved on this device|Bu cihazda kaydedildi
Save failed|Kaydedilemedi
Saving paused|Kayıt duraklatıldı
Select|Seç
Move|Taşı
Rotate|Döndür
Scale|Ölçekle
Resize|Boyutlandır
Delete|Sil
Duplicate|Çoğalt
Cancel|İptal
Close|Kapat
Apply|Uygula
Save|Kaydet
Reset|Sıfırla
Undo|Geri al
Redo|Yinele
Pan|Kaydır
Zoom|Yakınlaştır
Left click|Sol tık
Right click|Sağ tık
Middle click|Orta tuş
Scroll wheel|Fare tekerleği
Space|Boşluk
Top View|Üstten görünüm
Orbit Left|Sola döndür
Orbit Right|Sağa döndür
Align view to north|Kuzeye hizala
More views|Diğer görünümler
Split|Bölünmüş görünüm
Swap panes|Panelleri değiştir
Camera controls hint|Kamera kullanım rehberi
Dismiss camera controls hint|Kamera rehberini kapat
Position|Konum
Rotation|Dönüş
Dimensions|Ölçüler
Width|En
Height|Yükseklik
Depth|Derinlik
Length|Uzunluk
Elevation|Kot
Distance|Mesafe
Angle|Açı
Area|Alan
Name|Ad
Properties|Özellikler
Actions|İşlemler
Collections|Koleksiyonlar
Manage collections…|Koleksiyonları yönet…
Collapse panel|Paneli daralt
Expand panel|Paneli genişlet
Add level above|Üste kat ekle
Add level below|Alta kat ekle
Level height|Kat yüksekliği
Level|Kat
Building|Bina
Site|Arsa
Floor|Zemin
Ground|Arazi
Scans|Taramalar
Guides|Altlıklar
References|Referanslar
Reference settings|Referans ayarları
Guide image settings|Altlık resmi ayarları
Reference floor settings|Referans kat ayarları
Scan settings|Tarama ayarları
Measure: Distance|Ölçüm: Mesafe
Measurement options|Ölçüm seçenekleri
More shortcuts|Diğer kısayollar
Search|Ara
Search...|Ara...
Item|Ürün
Place item|Ürün yerleştir
Place once|Bir kez yerleştir
Continuation: Place once|Yerleştirme: Bir kez
Snapping: Lines|Yakalama: Çizgiler
Snapping: Grid|Yakalama: Izgara
Paint scope: Face|Kaplama kapsamı: Yüzey
Paint: Face|Kaplama: Yüzey
Cactus|Kaktüs
TV Stand|TV ünitesi
Dining table|Yemek masası
Dining Table|Yemek Masası
Single Bed|Tek kişilik yatak
Livingroom Chair|Salon koltuğu
Small Plant|Küçük bitki
Barbell|Halter
Toy|Oyuncak
Barbell Stand|Halter standı
Books|Kitaplar
Stool|Tabure
Pool table|Bilardo masası
Bookshelf|Kitaplık
Coat Rack|Askılık
Car Toy|Oyuncak araba
Bedside Table|Komodin
Modular Cabinet|Modüler dolap
Sofa|Kanepe
Bunkbed|Ranza
Office Table|Çalışma masası
Guitar|Gitar
Trash Bin|Çöp kutusu
Recessed Light|Gömme aydınlatma
Shelf|Raf
Table Lamp|Masa lambası
Ceiling Lamp|Tavan lambası
Closet|Gardırop
Coffee Table|Orta sehpa
Dining Chair|Yemek sandalyesi
Dresser|Şifonyer
Indoor Plant|İç mekân bitkisi
Ironing Board|Ütü masası
Double Bed|Çift kişilik yatak
Floor Lamp|Lambader
Easel|Şövale
Lounge Chair|Dinlenme koltuğu
Office Chair|Ofis sandalyesi
Piano|Piyano
Picture|Tablo
Rectangular Carpet|Dikdörtgen halı
Rounded Mirror|Yuvarlak ayna
Round Carpet|Yuvarlak halı
Threadmill|Koşu bandı
Standing Desk|Ayakta çalışma masası
Sprinkler|Yangın sprinkleri
Exit Sign|Çıkış levhası
Sewing Machine|Dikiş makinesi
Television|Televizyon
Power Outlet|Elektrik prizi
AC block|Klima dış ünitesi
Stereo Speaker|Hoparlör
Thermostat|Termostat
Toaster|Ekmek kızartma makinesi
Kettle|Su ısıtıcısı
Hydrant|Yangın hidrantı
Fire Detector|Yangın dedektörü
Smoke Detector|Duman dedektörü
Coffee Machine|Kahve makinesi
Ceiling fan|Tavan vantilatörü
Iron|Ütü
Air Conditioning|Klima
Computer|Bilgisayar
Alarm Keypad|Alarm tuş takımı
Ev-wall-charger|Elektrikli araç şarj ünitesi
Electric Panel|Elektrik panosu
Bathroom Sink|Lavabo
Angle Shower|Köşe duş
Toilet Paper|Tuvalet kâğıdı
Washing Machine|Çamaşır makinesi
Shower Rug|Banyo paspası
Bathtub|Küvet
Laundry Bag|Çamaşır sepeti
Squared Shower|Kare duş
Drying Rack|Çamaşır kurutmalığı
Toilet|Klozet
Microwave|Mikrodalga
Cutting Board|Kesme tahtası
Kitchen Utensils|Mutfak gereçleri
Kitchen Counter|Mutfak tezgâhı
Hood|Davlumbaz
Kitchen Bar|Mutfak barı
Kitchen Cabinet|Mutfak dolabı
Frying Pan|Tava
Fruits|Meyveler
Fridge|Buzdolabı
Kitchen Shelf|Mutfak rafı
Wine Bottle|Şarap şişesi
Stove|Ocak
Ball|Top
Bush|Çalı
Basket Hoop|Basketbol potası
Parking Spot|Park yeri
Palm|Palmiye
Sunbed|Şezlong
Fir|Köknar
Tree|Ağaç
Skate|Kaykay
Outdoor Playhouse|Bahçe oyun evi
Patio Umbrella|Bahçe şemsiyesi
Pillar|Sütun
Scooter|Skuter
Dishwasher|Bulaşık makinesi
Fireplace|Şömine
Ceiling attachment|Tavana takılır
Wall attachment|Duvara takılır
White|Beyaz
Soft White|Kırık beyaz
Cream|Krem
Beige|Bej
Light grey|Açık gri
Greige|Gri bej
Mid grey|Orta gri
Charcoal|Antrasit
Near-black|Siyaha yakın
Blush|Pudra
Tomato|Domates kırmızısı
Brick red|Kiremit kırmızısı
Oxblood|Bordo
Peach|Şeftali
Terracotta|Pişmiş toprak
Burnt orange|Yanık turuncu
Clay|Kil
Pale yellow|Açık sarı
Mustard|Hardal
Ochre|Aşı boyası
Gold|Altın
Mint|Nane
Sage|Adaçayı
Olive|Zeytin
Forest|Orman yeşili
Pale teal|Açık petrol
Teal|Petrol
Deep teal|Koyu petrol
Powder blue|Buz mavisi
Soft Blue|Açık mavi
Sky|Gök mavisi
Slate Blue|Arduvaz mavisi
Royal blue|Kraliyet mavisi
Navy|Lacivert
Lavender|Lavanta
Plum|Mürdüm
Aubergine|Patlıcan moru
Petal|Yaprak pembesi
Rose|Gül
Dusty Rose|Gül kurusu
Berry|Böğürtlen
Sand|Kum
Tan|Taba
Taupe|Vizon
Espresso|Koyu kahve
Search items…|Ürün ara…
Search items...|Ürün ara...
Search materials…|Malzeme ara…
Search materials...|Malzeme ara...
No results|Sonuç yok
No items found|Ürün bulunamadı
Appliance|Beyaz eşya
Kitchen|Mutfak
Bathroom|Banyo
Outdoor|Dış mekân
Colors|Renkler
Wood|Ahşap
Stone|Taş
Brick|Tuğla
Tile|Seramik
Concrete|Beton
Metal|Metal
Fabric|Kumaş
Leather|Deri
Roofing|Çatı kaplaması
Glass|Cam
Mine|Benim
Community|Topluluk
Scene materials|Sahne malzemeleri
Add material|Malzeme ekle
New material|Yeni malzeme
No custom materials yet — add one with +.|Henüz özel malzeme yok; + ile ekle.
Paint|Kaplama uygula
Erase|Silgi
Pick material|Malzeme seçici
Whole surface: a click paints the surface under it|Tüm yüzey: tıklanan yüzeyi kapla
Rectangle: press anywhere on a wall, floor or ceiling, drag to the opposite corner|Dikdörtgen: yüzeye basıp karşı köşeye sürükle
Polygon: click the points of a shape on a floor or ceiling|Çokgen: zemin veya tavandaki köşe noktalarına tıkla
Erase: click a painted part to remove it, or a painted surface to reset it|Silgi: kaplamayı kaldırmak için yüzeye tıkla
Pick: click a surface to paint with its material (or hold Alt / Option)|Seçici: malzemesini almak için yüzeye tıkla veya Alt tuşunu tut
Hover a surface to paint|Kaplamak için yüzeyin üzerine gel
Hold to pick a material|Malzeme almak için basılı tut
Color|Renk
Texture|Doku
Roughness|Pürüzlülük
Metalness|Metallik
Opacity|Opaklık
Transparency|Saydamlık
Material|Malzeme
Default material|Varsayılan malzeme
Slots|Yüzey grupları
Add slot|Yüzey grubu ekle
Body|Gövde
Edit mesh|Geometriyi düzenle
Enter Edit Mode to assign faces|Yüzey atamak için düzenleme moduna geç
Enter Edit Mode to use slot actions|Yüzey grubu işlemleri için düzenleme moduna geç
Interface|Arayüz
Theme|Tema
Dark|Koyu
Light|Açık
System|Sistem
Viewer|Görüntüleyici
Export|Dışa aktar
Import|İçe aktar
3D model|3D model
Export options|Dışa aktarma seçenekleri
Keyboard shortcuts|Klavye kısayolları
Audio|Ses
Units|Birimler
Metric|Metrik
Imperial|İngiliz ölçü birimleri
Meters|Metre
Millimeters|Milimetre
Grid|Izgara
Snapping|Yakalama
Visible|Görünür
Hidden|Gizli
Show grid|Izgarayı göster
Textures|Dokular
Camera|Kamera
Perspective|Perspektif
Orthographic|Ortografik
Walk|Yürü
Enabled|Açık
Disabled|Devre dışı
Switch to a building level to view and edit the floorplan.|Kat planını görmek ve düzenlemek için bir kat seç.
Click the start and end direction in 2D.|2D'de başlangıç ve bitiş yönüne tıkla.
The entered length is applied.|Girilen uzunluk uygulanır.
Length is taken from the two points.|Uzunluk iki nokta arasından alınır.
Press Start drawing to apply changed dimensions.|Değiştirdiğin ölçüleri uygulamak için Çizime başla'ya bas.
Replace this project's drawing with the backup? The current drawing is kept for undo.|Bu projenin çizimi yedekteki çizimle değiştirilsin mi? Mevcut çizim geri almak için korunur.
Restore the drawing from before the import?|İçe aktarmadan önceki çizime dönülsün mü?
Drawing could not be saved. Check storage and download a JSON backup.|Çizim kaydedilemedi. Alanı kontrol edip JSON yedeğini indir.
The backup could not be restored.|Yedek geri alınamadı.
The backup must be no larger than 20 MB.|Yedek en fazla 20 MB olabilir.
This is not a Floor Plan JSON backup.|Bu dosya bir Kat Planı JSON yedeği değil.
The backup drawing structure is invalid.|Yedekteki çizim yapısı geçersiz.
The backup is too large.|Yedek çok büyük.
The backup contains an invalid object.|Yedekte geçersiz nesne var.
The backup could not be opened.|Yedek açılamadı.
`;
const pairs = entries.trim().split('\n').map(line => line.split('|'));
const english = new Map(pairs.map(([en,tr]) => [tr,en]));
const turkish = new Map(pairs.map(([en,tr]) => [en,tr]));
export function translateLabel(text: string, language: Language) {
  const trimmed = text.trim();
  const translated = (language === 'tr' ? turkish : english).get(trimmed);
  if (!translated) return text;
  return text.replace(trimmed, translated);
}
