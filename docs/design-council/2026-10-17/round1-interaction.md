# Tur 1 — C: Etkileşim, erişilebilirlik ve durum dili

Bu görüş, mevcut ürün sınırları içinde araştırmayı daha rahat kullanmanı hedefliyor. Önerim açık veri yüzeyi, koyu metin, mavi etkileşim vurgusu ve orta yoğunluk. Henüz ortak karar veya nihai oy değildir. Üretim kodunu değiştirmedim; önceki V3 HTML’ini onaylanmış tasarım saymıyorum.

## Gerçekte gördüklerim

Yerel `tikr-financials.png` ve `koyfin-financials.png` görüntülerini açıp inceledim. TIKR’de koyu üst bar, açık sol menü ve beyaz veri alanı var. Turuncu hem aktif Financials sekmesinde hem dönem ve birim seçimlerinde kullanılıyor. Sayılar sağa hizalı; toplamlar kalın, alt metrikler girintili. Arama alanı belirgin. Bununla birlikte şirket araştırmasına ilişkin seçeneklerin sol menü ve yatay sekmelerde tekrar etmesi bizim beş görevli yapımıza gereksiz yük getirir.

Koyfin örneğinde koyu kabuk içindeki açık tablo baskın. Üstte şirket bağlamı kısa tutulmuş; Annual/Quarterly seçimi ayrı bir kontrol. Gerçek ve tahmini dönemler görünüşte ayrılıyor. İnce çizgiler, metrik grupları ve hizalanmış kolonlar çok veriyi birlikte okutuyor. Görsellerden klavye davranışı, gerçek dokunma hedefleri veya ekran okuyucu desteği hakkında sonuç çıkarmıyorum. Bunlar tarihsel/resmî görsel örnekleri; bugün kullanılan bütün ürünün denetimi değildir. Fiscal.ai ve Stock Rover arayüzlerini görmüş gibi değerlendirmiyorum.

Mevcut `LeftNav.tsx` beş Türkçe görevi, `aria-current` bilgisini ve mobil alt menüyü zaten barındırıyor. `TopBar.tsx` araması mevcut varlıkları süzüyor; genel piyasa araması vaat edemeyiz. `ChartWorkspace.tsx` içinde 9px dönem butonları, 10px veri etiketleri, yalnız `title` taşıyan grafik ikonları ve 256px sabit yan liste var. CSS’te görünür odak ve azaltılmış hareket desteği bulunuyor. Yeniden tasarım bunların iyi taraflarını koruyup küçük kontrolleri ve dar ekran sıkışmasını çözmeli.

## İki yaklaşım ve benim tercihim

**A: Beyaz veri + mavi eylem.** Zemin `#F3F5F7`, veri yüzeyi `#FFFFFF`, ana metin `#17212B`, yardımcı metin `#526071`; ana eylem `#175CD3` ve beyaz yazı. Seçim için açık mavi yüzey, koyu mavi yazı ve çizgi kullanırım. Böylece kırmızı/yeşil finansal değişime, amber veri uyarısına ayrılır. Renkler öneridir; prototipte gerçek metin/yüzey çiftleri ölçülmelidir.

**B: Koyu terminal + amber eylem.** Mevcut koyu tokenlara yakın bir kabuk ve amber seçim araştırma aracını güçlü hissettirebilir. Ancak amberi seçime, uyarıya ve gösterge çizgisine aynı anda vermek anlamları birbirine yaklaştırır. Tamamen koyu yüzeyde uzun finansal tablo okumak isteyen kullanıcı için kontrast dengesi de ayrıca çözülür. Ben A’yı savunuyorum: seçili durumla eksik veri uyarısını daha temiz ayırıyor. TIKR’nin turuncusunu ürünümüze kopyalamak tek başına gerekçe değil.

## Buton ve label kataloğu

| Tür / durum | Görünüş ve ürün metni | Davranış |
|---|---|---|
| Primary | Dolu mavi: “Kaydı kaydet”, “Liste oluştur” | Aktif çalışma bölgesinde tek baskın eylem; gezinme için kullanılmaz. |
| Secondary | Beyaz, belirgin sınır: “İzleme listesine ekle” | Primary ile aynı yükseklik; ekleme sonrası “Listemde” ve işaret. |
| Text | Altı hover/odakta çizilen “Araştırmayı aç” | Başka sayfaya gidiyorsa gerçek bağlantı. |
| Destructive | Kırmızı metin/sınır: “Listeden kaldır” | Nesneyi açıkça adlandırır; “Sil” tek başına kullanılmaz. |
| Disabled | Nötr yüzey, okunur açıklama | “Mum grafiği için OHLC verisi gerekli”; sebep hover’a bağlı kalmaz. |
| Loading | “Kaydediliyor…” + sabit genişlik | Tekrar gönderimi engeller; odak kaybolmaz, durum duyurulur. |
| Selected | Açık mavi dolgu + koyu yazı + çizgi/işaret | Dönemde tek seçim, SMA katmanlarında bağımsız aç/kapa. |
| Focus | İki katmanlı, yüzeyden ayrılan 2–3px halka | Hover’dan ve selected’dan ayırt edilir; kesilmez. |

Label sistemi başlık, veri durumu ve eylemi ayırır. “Teknik”, “Temel”, “Risk”, “Haberler”, “AI analizi” bölümleri aynı dilde kalır. `SMA 20` gibi yerleşik kısaltmalar açıklamayla desteklenir. “Canlı” etiketi zaman damgasından türetilmez. Sürekli titreşen nokta güvenilirlik kanıtı değildir.

Durumlar: “Veri yok” nötr; “Kısmi veri” amber; “Yetersiz geçmiş” amber ve gereken koşul; “Son veri: [zaman]” nötr tarih; “Yüklenemedi” hata metni ve uygulanabilir yeniden deneme. Yeşil/kırmızı yalnız uygun finansal anlamda kullanılır; değişimin artı/eksi işareti de gösterilir. Olumlu fiyat değişimi şirket kalitesini veya alım önerisini ifade etmez.

## Boyutlar ve tablo yoğunluğu

Masaüstünde normal buton 36–40px, mobilde ana dokunma hedefi en az 44px; grafik ikonlarında görünen ikon 18px olsa da hedef 36px olsun. Kontroller arasında 8px boşluk öneriyorum. Varsayılan tablo satırı 40px, isteğe bağlı kompakt görünüm 32px; mobilde satır eylemleri 44px hedefi korur. 28px satırları varsayılan yapmam.

Gövde 14px, tablo 13px, yardımcı bilgi 12px, bölüm başlığı 18px, şirket başlığı 24px; 9–10px işlevsel metinleri kaldırırım. Sayılarda tabular numerals ve sağ hizalama, etiketlerde sola hizalama kullanılmalı. Her değeri monospace yapmak kolonları gereksiz genişletir. Birim ve dönem başlıkta görünür; yalnız tooltip içinde saklanmaz. Başlıklar sabitlenebilir; yatay kaydırma tablo bölgesinde kalır.

## Klavye, mobil ve eksik veri örnekleri

Aramada `Ctrl+K`/`⌘K` mevcut girişe odak verebilir; alan yazılımlarına müdahale eden genel harf kısayolları eklemem. Yukarı/aşağı sonuç seçer, Enter açar, Escape listeyi kapatır. Sonuç sayısı duyurulur. “Eşleşen kayıt yok” ardından “Varlıkları yönet” mevcut akışına bağlantı sunulabilir; tüm piyasada sonuç bulunduğu izlenimi verilmez.

Gerçek sekmeler ok tuşlarıyla, gezinme bağlantıları Tab ile çalışır. SMA kontrolleri `aria-pressed` taşır. Grafik türleri erişilebilir ad alır; OHLC olmadığında çizgi seçeneği açıklamayla kullanılabilir kalır. Grafiğin önemli bilgilerine metin özeti veya mevcut veri üzerinden erişilebilir tablo eşlik eder; yalnız fareyle beliren crosshair yeterli değildir.

Modal açıldığında anlamlı ilk alana odak gider; Tab içeride dolaşır, Escape kapatır ve odak açan kontrole döner. Kayıt kaybı olan kapatmalarda somut değişiklik uyarılır. Mobilde beş görevli alt menü korunur; uzun etiketler anlaşılmaz kısaltmalara dönüşmez. Araştırmanın yan listesi açılır panel olur; sabit genişliği grafiği ezmez. Kaydırılabilir sekmelerin devamı görsel olarak anlaşılır kalır.

Fiyat eksikken “Portföy toplamı: Hesaplanamıyor” ve “Fiyatı bulunan pozisyonların ara toplamı” ayrı gösterilir. Getiri `—` olur; maliyet güncel fiyat yerine konmaz. AI başarısızsa “AI analizi alınamadı” gösterilir, hazır bir karar yazılmaz. Bir araştırma bölümü başarısızken başarılı bölümler okunabilir kalır. Prototipin boşluklarını doldurmak için finansal rakam veya rapor uydurulmaz.

## Diğer uzmanlara somut itirazlarım

1. Görsel kimlik uzmanı amberi bütün aktif alanlara önerirse itirazım var: “Kısmi veri” ile aktif sekmeyi aynı renkte okumak kolaylaşır. Ayrı semantik ve metin gerekir.
2. Yatırımcı iş akışı uzmanı her metrik için kart isterse itirazım var: dönem karşılaştırmaları ortak kolon hizasını kaybeder. Finansallar tablo, yorum bölümleri metin yüzeyi olmalı.
3. Her ikisi de ilk ekrana çok araç sığdırmak için 10–11px yazı ve 28px satır isterse karşı çıkarım. Önceliklendirme, yazıyı küçülterek çözülmemeli.
4. “AI analizi”ni sürekli dolu ana buton yapmak pahalı/başarısız olabilen bir işlemi doğal sonraki adım gibi gösterebilir. Görünür fakat bağlama göre ikincil konumunu savunuyorum.

## Önerimin kaybı

Mavi ve orta yoğunluk daha tanıdık, daha az karakteristik görünebilir. Aynı yükseklikte daha az satır görünür; deneyimli kullanıcı daha çok kaydırır. Tam koyu ortamı tercih eden kullanıcı için ilk önerim ideal olmayabilir. Bu kayıpları kabul ediyorum; kompakt seçenek ve ileride aynı semantiği koruyan tema bu ihtiyacı karşılayabilir. Bu turda yeni backend işlevi veya nihai uzlaşma önermiyorum.
