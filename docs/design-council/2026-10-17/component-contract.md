# Kazanan kararların bileşen sözleşmesi

Bu sözleşme `vote-results.json` içindeki 18 kazanan kararı HTML prototipinde denetlenebilir kurallara çevirir. Yeni ürün yeteneği veya üretim uygulamasına geçiş tanımlamaz. C’nin D14 karşı oyu kayıtta kalır; uygulanan eylem kazanan **“Taslağı önizle”** metnidir.

## Yüzey, boyut ve tipografi

Beyaz veri yüzeyi ve nötr açık canvas; üst/sol gezinme `#191E25`, etkileşim `#2458D3`. Amber yalnız veri uyarısında kullanılır. Finansal artış/azalış rengi işaretli sayıyla birlikte gösterilir; seçili kontrol, pozitif getiri anlamı taşımaz. Gerçek metin/yüzey çiftleri kontrast kontrolüne girer.

Masaüstünde sidebar 192px, üst bar 56px, kenarlar 24px, panel arası 16px; panel radius 6px, kontrol radius 4px. Gölge yalnız modal, açılır menü ve benzeri üst katmanlarda bulunur. Gövde 14px, tablo 13px, yardımcı bilgi 12px, şirket başlığı 26px, panel başlığı 16px. Rakamlar sağa hizalı ve tabular numerals kullanır. Normal tablo satırı 40px; kullanıcı seçimiyle kompakt 32px. Mobilde 44px etkileşim hedefi küçültülmez. Masaüstü buton 36px olabilir; ikon görseli 18px olsa da hedef alanı korunur. Metin büyümesi sabit yükseklikte kesilmez.

## Buton kataloğu ve tam etiketler

| Tür | Kullanım ve görünüş | Metin |
|---|---|---|
| Primary | Aktif formda en çok bir dolu kobalt eylem | Günlükte “Taslağı önizle” |
| Secondary | Açık yüzey ve görünür sınır; ekleme/ayrıntı | “İzleme listesine ekle”, “Kaynak ayrıntıları”, “İşlem kaydı ekle” |
| Link | Sayfa/bölüm gezinmesinde gerçek bağlantı | “Araştırmayı aç”, “Portföyü incele”, “Raporu aç” |
| Destructive | Kırmızı, kaldırılan nesne açık | “Listeden kaldır” |
| Icon | Metne yardımcı; yalnız kullanılırsa erişilebilir ad | “Mum”, “Heikin Ashi”, “Çizgi”, “Alan” |

Beş görev tam adlarıyla **Bugün / Araştır / İzleme Listem / Portföy / Günlük**; mobilde hepsi alt menüde görünür. Araştırma sırası **Genel bakış / Grafik / Finansallar / Risk / Haberler / AI raporu**. Başlangıç Genel bakış; görev ana yüzeyi devralır. Prototip Araştır/Genel bakışta kaynaklı rapor kesitiyle açılır; bu, üretimin varsayılan URL davranışını değiştirmez.

Özet etiketleri **“Güncel değer”, “Maliyet”, “Fiyat kapsamı”**. Güncel toplam bilinmiyorsa açıklama ve **“Fiyatı bulunan pozisyonların ara toplamı”** ayrı görünür. Eksik getiri `—`; maliyet güncel fiyat yerine geçmez. Bugün sırası portföy durumu, performans/dağılım, pozisyonlar, haber/takvim; makro kısa şerittir.

## Durumlar ve semantik

Disabled kontrol nedeni yakınında görünür: “Mum grafiği için OHLC verisi gerekli.” Loading etiketi yapılan işi söyler, genişliği korur ve tekrar gönderimi engeller; odak kaybolmaz. Prototip bağlı olmayan API için sahte yükleme/başarı üretmez. Selected dönem tek seçimdir; SMA aç/kapa `aria-pressed` taşır. Ana gezinme `aria-current="page"`, gerçek sekmeler `aria-selected` kullanır.

Odak halkası 2–3px, yüzeyden boşlukla ayrılır; hover ve seçili durumdan farklıdır. Hata **“Yüklenemedi”**, boşluk **“Veri yok”**, eksik kapsam **“Kısmi veri”**, yetersiz geçmiş **“Yetersiz geçmiş”** olarak ayrılır. Yeniden deneme yalnız gerçek uygulanabilir işlem varsa sunulur. Son gözlem zamanı “Canlı” diye yeniden adlandırılmaz. Durum metni yalnız renge dayanmaz; gerekli bildirimler `role="status"`/uygun canlı bölgeyle duyurulur.

## Klavye ve kaynak ayrıntıları

Arama etiketi **“Kayıtlı varlıklarda ara”**. Ctrl/⌘K odaklar; oklar sonuç seçer, Enter açar, Escape kapatır. Sonuç sayısı duyurulur; görünür sonuç ve etkin seçenek bağı tutarlıdır. Sekmeler ok tuşlarıyla seçilir ve görünür alana kayar; sayfa bağlantıları Tab ile gezilir. Yatay taşan sekme şeridinin devamı anlaşılır kalır.

Kaynak/dönem/birim satırı kalıcı, ayrıntı paneli başlangıçta kapalıdır. **Viewport ≥1440px ve 280px panel açıldıktan sonra tablo ≥900px** koşulları birlikte sağlanırsa isteğe bağlı nonmodal yan panel açılır. Diğer durumda modal drawer kullanılır. Nonmodal panel odağı hapsetmez; başlığına odak verilebilir, belge gezinmesi sürer. Modal drawer başlığıyla adlandırılır, arka plan etkisizleşir, Tab içeride kalır, Escape kapatır. Kapatma odağı açan kontrole döndürür. Genişlik değişimi sonrasında görünürlük ve odak kaybolmamalıdır.

## Prototip kabul listesi

- 320px ve geniş masaüstünde sayfa yatay taşmaz; tablo yalnız kendi bölgesinde kayar. Beş görev, uzun label ve 44px hedefler korunur.
- Klavyeyle arama, altı sekme, kaynak paneli, kapatma ve odak dönüşü denenir; etkileşimsiz dekoratif buton bırakılmaz.
- Kontrast, odak görünürlüğü, 40/32px satırlar ve 12px yardımcı metin kontrol edilir.
- Günlükte **“Prototip taslağı — yalnız bu açık oturumda tutulur”** görünür; “Sunucuya kaydedilmez; yenilemede silinir” açıklaması eklenebilir. Önizleme kayıt başarısı gibi sunulmaz.
- AI’nin Temel, Teknik, Risk, Boğa, Ayı, Portföy Yöneticisi sırası görünür; gerçek çıktı yoksa her rolde açık durum bulunur. Sahte ilerleme veya anlatı yoktur.
- Kaynaklı rapor kesiti tarih ve birim taşır; referans ekran rakamları, uydurma fiyat/getiri veya AI sonucu ürün verisine dönüşmez.
