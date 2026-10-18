# HTML prototipi — doğrulama kaydı

## Komut ve kanıt

Yerel bağımsız HTML için çalıştırılan komutlar:

```text
python .cache/design-council-v4/build.py
node .cache/design-council-v4/verify.cjs
```

İnceleme düzeltmelerinden sonraki 2026-10-17T16:26:07.826Z koşusunda **22 grup geçti, çıkış kodu 0**. Bu rapor ve son inceleme ekleri HTML'e alındıktan sonra aynı doğrulama son paket üzerinde tekrar çalıştırılır. Teslim edilen son koşunun zamanı, 22 ayrı sonucu, HTML ve tam görüşme dosyasının SHA-256 değerleri [verification-results.json](verification-results.json) dosyasındadır. Test sonucu dosyası kendi içeriğine hash eklemeye çalışmaz; bağımsız çıktı olarak saklanır.

## Kontrol edilenler

- 3 gerçek agent ×18 karar =54 özgün oy; 16 oybirliği, 2 çoğunluk kararı; moderatör 0 oy. HTML oyları/gerekçeleri üç ayrı oy dosyasıyla karşılaştırılır.
- HTML'e gömülen bütün protokol, görüşme, karar ve inceleme metinleri kaynak dosyayla karakter karakter ve SHA-256 ile karşılaştırılır. Karşı oylar korunur.
- Açılış Genel bakış; altı araştırma sekmesi; sekme ok tuşları; seçili etiketin mobil yeniden çizimde görünmesi.
- Microsoft raporundan sekiz gerçek finansal satır; ilk gelir/son EPS dönem değerleri için bağımsız beklenen değerler. 13px rakamlar, 40/32px masaüstü satırları.
- Geniş kaynak panelinde en az900px veri alanı; 1440px→1280px geçiş; modal/Escape ve açıcıya odak dönüşü. Native modalın Tab gezinmesi kontrol edilir; tarayıcı chrome odağı belge `body`siyle temsil edilebilir, arka sayfa kontrollerine geçiş kabul edilmez.
- Grafik görünüm/dönem/gösterge kontrolleri; OHLC yokluğunda disabled Mum/Heikin Ashi; dört veri durumu; sahte fiyat çizgisi olmaması.
- Altı analist rolü ve belgelenen sıra; her rolde gerçek çıktı bağlanmadığı açıklaması.
- İzleme ekleme/kaldırma; Ctrl+K, sonuç yokluğu, ok/Enter; arama kapatmada Enter; Günlük/Portföy içeriğe geç bağlantısı.
- Kullanıcı notunun güvenli metin önizlemesi; gezinmede oturum içi korunması; yenilemede temizlenmesi. İşlem formunun kaydetmeyen tasarım önizlemesi olduğu açıklaması.
- Yedi görünüm ve altı araştırma bölümü: **320,390,768,1024,1440,1920px**. Belge yatay taşması kontrol edilir; finansal tablolar kendi bölgesinde kayar.
- Yedi görünüm için390 ve1440px'de axe WCAG2A/AA,2.1AA otomatik taraması; kontrol edilen kurallarda ihlal yok. Bu, bütün erişilebilirlik ölçütlerinin insan denetimi yapıldığı iddiası değildir.
- 390px'de arama/kaynak/segment/bağımsız bağlantı hedefleri en az44px; beş ana görev görünür, metin12px. Seçilmiş yardımcı metinlerin hesaplanan boyutu12px.
- Testlerde **0 dış HTTP isteği,0 sayfa JavaScript hatası**. Finansal sağlayıcıya bağlanılmaz.

## Görsel inceleme ve sınırlar

Ana agent masaüstü genel bakış, finansallar, geniş kaynak, mobil genel bakış ve mobil AI görüntülerini kontrol eder. Üç agent hangi görüntüleri gerçekten açtığını kendi inceleme dosyasında belirtir. Görsel kaynaklar resmî yayımlanmış TIKR/Koyfin/Stock Rover ekranlarıdır; canlı giriş yapılmış dashboard kullanımı değildir. Fiscal.ai arayüzüne erişildiği iddia edilmez.

Doğrulama bağımsız HTML içindir. Üretim frontend lint/coverage/build, backend, gerçek API/hesap entegrasyonu veya canlı sağlayıcı doğrulaması yapılmış gibi sunulmaz. Manuel ekran okuyucu, bütün işletim sistemleri/tarayıcılar ve her kullanıcı yazı büyütme tercihi bu kontrol kapsamının dışındadır. Bu tasarım ileride uygulanırsa repo doğrulama sözleşmesindeki runtime kontrolleri o değişiklik üzerinde çalıştırılmalıdır.

İlk testlerin yakaladığı hatalar ve agent bulgularının karşılıkları [review-resolution.md](review-resolution.md) içinde açıkça korunur.
