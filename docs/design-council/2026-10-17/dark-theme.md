# Kullanıcı revizyonu — dark tema

Kullanıcı mevcut prototipin görünüşünü beğendi; temanın dark olmasını istedi. Bu belge kurul kararlarından sonraki kullanıcı yönlendirmesini kaydeder. Yeni bir agent oylaması yapılmadı. Önceki 54 oyun seçenekleri, gerekçeleri ve karşı görüşleri tarihsel kayıt olarak aynen korunur.

## Görsel kararlar ve nedenleri

| Alan | Dark karşılığı | Neden |
|---|---|---|
| Ana zemin | `#0E1218` | Panelleri taşıyan düşük parlaklıklı, hafif soğuk antrasit alan. |
| Veri panelleri | `#171E27`; ikincil yüzey `#1D2632` | Tablo ve rapor katmanları ton farkıyla ayrılır. |
| Üst/sol görev menüsü | `#10151C` | Araştırma verisinden daha geride kalan gezinme katmanı. |
| Ana/yardımcı metin | `#E6EDF6` / `#A7B4C5` | Başlık, finansal sayı ve kaynak açıklaması ayrı ağırlıkta okunur. |
| Primary buton | Kobalt `#2458D3`, beyaz metin | Mevcut eylem kimliğini korur; açık mavi dolgu üzerinde beyaz metin kullanılmaz. |
| Bağlantı/seçili sekme | `#9BB8FF`; seçili zemin `#253655` | Koyu zeminde tıklanabilir metin ve seçili bağlam yeterli ayrım taşır. |
| Grafik serileri | Gelir `#7FA6FF`, net kâr `#61BDB8` | İnce çizgi ve çubuklar koyu yüzeyde belirgin kalır; etiket/legend eşleşir. |
| Uyarı | Metin `#E5B66B`, zemin `#352B1D` | Amber yalnız uyarı/karşı oy bağlamında kullanılır. |
| Artış/azalış | `#76CAA8` / `#F28F98` | Koyu zeminde okunur finansal durum renkleri; gerçek değer yokken sayı üretilmez. |
| Klavye odağı | `#91B3FF`, 3px halka | Seçiliden ayrı, koyu yüzeylerde görünür odak. |

D01'in açık yüzey tercihi bu kullanıcı revizyonuyla dark yüzeye çevrilir. D02'nin eylem rengi korunur; metin, grafik ve seçili durum tonları dark zemine uyarlanır. Diğer sayfa, tipografi, yoğunluk, buton/label ve davranış kararları aynı kapsamda uygulanır.

Finansal tablolarda zebra satırlar, sticky başlıklar, hover; arama/kaynak/işlem modalları; form alanları; boş/veri eksik durumları; kurul oy tablosu ve görüşme panelleri temaya dahildir. Referans ürün ekran görüntüleri özgün renkleriyle bırakılır; bunlar yeni tasarımın canlı panelleri değildir.

## Çıktı ve kontrol

Bağımsız dark HTML: `docs/prototypes/mercek-design-council-dark.html`. Önceki açık sürüm ayrı karşılaştırma örneğidir. Bu revizyon üretim frontend entegrasyonu değildir.

Kontrol komutları: `python .cache/design-council-v4/build-dark.py`, ardından `node .cache/design-council-v4/verify-dark.cjs`. Sonuçlar [dark-verification-results.json](dark-verification-results.json) içinde ayrı saklanır; açık sürümün doğrulama kaydıyla karıştırılmaz. Kontroller yedi görünüm, altı araştırma sekmesi, 320–1920px genişlikler, klavye ve kaynak paneli davranışı, mobil hedefler ve axe renk kontrastı kurallarını kapsar. Masaüstü ve mobil görüntüler ayrıca görsel olarak incelenir.
