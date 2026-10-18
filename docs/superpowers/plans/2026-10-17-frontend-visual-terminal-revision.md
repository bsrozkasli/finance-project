# Mercek V3 — gerçek uygulama ekranlarından frontend görsel analizi

Tarih: 2026-10-17. Durum: kullanıcı incelemesi için HTML tasarım önerisi.

## Düzeltilen kapsam

Kullanıcı önceki araştırmanın ürün/kod benzerliğine kaydığını belirtti ve renk, görünüm ve ekran yapısının incelenmesini istedi. Bu revizyonda referans seçimi, yatırım araştırmasının grafik, finansal tablo, izleme listesi ve dashboard yüzeyleriyle görsel eşleşmeye göre yapıldı. Açık kaynak olmak seçim ölçütü değildir.

Önceki V2 önerisindeki büyük serif başlıklar, krem/adaçayı yüzeyleri, editoryal söylem ve geniş kart boşlukları bu görsel yön için terk edildi. Bu belge V2 planındaki renk, tipografi, dashboard hiyerarşisi ve referans seçimi kararlarının yerine geçer. Veri doğruluğu, mevcut route'lar ve uygulama sınırları korunur.

Teslim: `docs/prototypes/mercek-terminal-visual.html`. Dosya yeni tasarımla açılır; “Görsel analiz” bağlantısı incelenen gerçek ekranları, renk örneklerini ve karar eşlemesini gösterir. Eski HTML tarihsel karşılaştırma için durur.

## Yöntem ve incelenen ekranlar

Resmî ürün/yardım sayfalarındaki uygulama ekranları indirildi ve görsel olarak açılıp incelendi. Pazarlama sayfasının dekorasyonunu uygulama dili saymadık. Siteye giriş yapılmadı; incelenen görsellerin güncel ürünün her ekranını temsil ettiği iddia edilmez. Koyfin örneği tarihsel bir ürün görselidir.

1. **TIKR / Detailed Financials:** [Resmî ekran](https://d39we3xer0vs8v.cloudfront.net/DetailedFinancials-Hero.png), [ekranın yayımlandığı ürün sayfası](https://www.tikr.com/).
2. **Koyfin / Financial Analysis:** [Resmî ekran](https://www.koyfin.com/wp-content/uploads/2022/12/financial-analysis-header-1.png), [ürün sayfası](https://www.koyfin.com/features/financial-analysis/). Önceki incelemedeki My Dashboards ekranı da panel yoğunluğu için karşılaştırıldı.
3. **TradingView / Market Summary ve Watchlist Advanced View:** [Resmî yardım sayfası](https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/), sayfadaki [piyasa ekranı](https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43611966415/original/VODqOic2tKdOtUd-WM9pUX_-3gbbeVK5iQ.png?1773416753=) ve [tablo ekranı](https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/43611969016/original/VqMXEPIS5EWmcNbq310VfBzLLmJ82lueBg.png?1773417390=).

Ghostfolio, Wealthfolio, OpenBB ve Quartr bu revizyonun görsel dayanakları değildir. Fiscal.ai/FinChat sayfası 403 verdi; görsel incelenmiş gibi değerlendirmeye alınmadı.

## 1 — TIKR: nötr yüzey ve sıcak seçim vurgusu

**Görülen:** Kömür üst bar, açık gri sol gezinme, beyaz ana veri yüzeyi. Turuncu; seçili sekme, sembol ve dönem/birim kontrolünde. Şirket adı ve sembol sans; fiyat sağda belirgin. Veri tablosunda sağa hizalı sayılar, koyu kolon başlığı ve vurgulu toplam satırları var. Ekran bir tanıtım başlığıyla başlamıyor; şirket kimliğiyle başlıyor.

**Yorum:** Nötr ve geniş veri alanı taramayı destekler. Dar alandaki sıcak renk, hangi analiz/ayarın seçili olduğunu ayırt etmeye yardım eder. Bu gerekçe bizim tasarım yorumumuzdur.

**Mercek kararı:** Üst bar kömür, sidebar açık gri, ana analiz beyaz. Büyük serif yerine 25px sans şirket başlığı. Araştırma sekmesi altında dönem ve birim bilgisi tek şeritte. Amber seçim rengi ayrı; finansal olumlu/olumsuz anlamını taşımaz.

**Birebir alınmayan:** İki ayrı yerde tekrarlanan uzun şirket menüsü ve mevcut olmayan değerleme modeli/ownership araçları. Mercek'in beş görevli gezinmesi kalır.

## 2 — Koyfin: tablo birincil çalışma yüzeyi

**Görülen:** Koyu dış kabuk ve beyaz/açık gri veri alanı. Finansallar geniş, kesintisiz bir tablo; ince kolon/satır ayırıcıları, düşük köşe yuvarlaklığı ve sağa hizalı sayılar. Şirket bağlamı üstte kompakt. Tekrarlanan gölgeli kartlar yerine aynı yüzeyde grup başlıkları ve metrikler kullanılmış.

**Yorum:** Çok sayıda finansal metriğin karşılaştırılması için hizalama, satır ritmi ve sabit başlık, dekoratif kart ağırlığından daha yararlı olabilir. Koyu araç kabuğu, açık tablodan ayrılır.

**Mercek kararı:** Finansallar görünümünde 8 rapor satırı × 3 mali yıl. Yaklaşık 33px kompakt satır ritmi, ince çizgiler, zebra satırlar ve sağa hizalı tabular numerals. “Kompakt / rahat” kontrolü rakamları değiştirmeden satır aralığını değiştirir. İçerik panelleri 4px köşe ve gölgesiz yüzey kullanır.

**Birebir alınmayan:** Onlarca kolon, tahmin/consensus alanları ve çok katmanlı menüler. Mevcut verinin desteklemediği kolon eklenmez.

## 3 — TradingView: grafik ve yan panelin alan ağırlığı

**Görülen:** Market Summary ekranında büyük grafik solda, daha dar indeks listesi sağda. Watchlist Advanced View beyaz; hafif yatay ayırıcılar, küçük sembol etiketleri, sağa hizalı rakamlar. Aktif sekmede alt çizgi, düşüşte kırmızı renk. İkon araçları ince bir rayda toplanmış.

**Yorum:** Grafik ana görevi, yan panel yardımcı bağlamı taşıdığı için eşit alan almıyorlar. Finansal anlam taşıyan rengin yüzey dekorasyonundan ayrılması görsel karışıklığı azaltabilir.

**Mercek kararı:** Araştırma ekranında esnek ana analiz alanı + 258px kaynak/not paneli. Dashboard'da performans, dağılım ve pozisyonlar yeniden ayrı çalışma bölgeleri. Liste satırları kartlara bölünmez. Fiyat bağlı değilse dekoratif getiri çizgisi çizilmez.

**Birebir alınmayan:** İşlem yürütme, Pine, sohbet ve yoğun çizim araçları. Mevcut ürünün desteklediği grafik/araştırma kontrolleri esas alınır.

## Renk örnekleme kanıtı

Pillow ile indirilen PNG'lerin en sık görülen RGB değerleri sayıldı. Bunlar **ekran görselinin renkleridir**; sitenin CSS tokenları veya tasarım sisteminin tam paleti olarak sunulmaz. Font ailesi ekran görüntüsünden kesin tespit edilmedi.

| Görsel | Örneklenen renkler | Kullanım gözlemi |
|---|---|---|
| TIKR | `#FFFFFF`, `#F8F8F8`, `#262626`, `#FF9300` | Beyaz veri, açık sidebar, koyu üst bar, turuncu seçim |
| Koyfin | `#FFFFFF`, `#F3F4F7`, `#191E23`, `#E9EAEC` | Veri yüzeyi, panel/canvas, dış kabuk, tablo başlığı |
| TradingView tablo | `#FFFFFF`, `#F9F9F9`, `#F2F2F2`, `#0F0F0F` | Nötr yüzeyler ve koyu metin; finansal negatif örnek `#CC2F3C` |

Kaynak görseller ve ham örnekleme çıktısı yerel `.cache/design-research-2026-10-17/` altında; teslim HTML'i üç referans görselini dosyanın içinde taşır. Böylece kullanıcı hangi ekranın hangi karara dayanak olduğunu görebilir. Görsel içindeki rakamlar Mercek verisi gibi sunulmaz.

## Mercek için seçilen görsel sistem

| Alan | V3 kararı | V2'den farkı |
|---|---|---|
| Canvas | `#F0F2F5` | Sıcak krem yerine soğuk nötr |
| Veri yüzeyi | `#FFFFFF` | Kesintisiz, beyaz tablo/grafik yüzeyi |
| Sidebar | `#F7F8FA`, masaüstü 200px | Açık, kompakt görev gezinmesi |
| Üst bar | `#22262C`, 55px | Koyu araç/arama yüzeyi |
| Seçim/ana eylem | Amber `#F0A339`, koyu metin `#241B0B` | Beyaz metni parlak turuncu üzerine koymuyoruz; kontrast doğrulanır |
| Aktif sekme/metin | Koyu amber `#9C4B06` | Açık yüzeyde okunabilir vurgu |
| Tipografi | Segoe UI / sistem sans; şirket adı 25px, panel 14px, metin 12–13px, yardımcı etiket 10–11px | Serif ve 48px editoryal başlık kaldırıldı |
| Sayılar | Tabular numerals, sağ hizalama, dönem/birim başlığı | Daha düzenli finansal tarama |
| Panel dili | 4px köşe, 1px çizgi, gölgesiz, 18px kolon aralığı | Daha sıkı terminal yapısı |
| Mobil | Tek kolon, alt menü, tablo bölgesinde yatay kaydırma | Sayfanın kendisi yatay taşmaz |

HTML başlangıçta dolu ve temsil edici **Araştır / Finansallar** görünümüyle açılır. Bugün ekranında mevcut üründeki piyasa, portföy, performans, dağılım ve pozisyon bölgeleri gösterilir. Veriler bağlı olmadığı için bu alanlar `—` ve açıklama taşır. Finansal tablo Microsoft'un resmî FY2025 raporundaki gerçek FY2023–FY2025 değerlerini kullanır.

## Uygulamaya geçiş planı

1. Bu HTML'de palet, tablo yoğunluğu ve panel oranlarını kullanıcı incelemesine sun.
2. Görsel yön onaylanırsa tek üretim token kaynağı olan `frontend/src/index.css` ile kabuğu (`TopBar`, `LeftNav`) taşı.
3. `DashboardHome` içindeki performans/dağılım/pozisyon ve haber/takvim alanlarını yeni grid'e yerleştir. HTML'deki boş piyasa alanlarını gerçek API verisiyle bağla.
4. `ChartWorkspace` içinde sembol başlığı, grafik ve araştırma sekmelerini yeni görsel kurallara taşı; kaynağı/dönemi verinin yanında tut. Statik Microsoft rapor kesitini üretim veri kaynağı yapma.
5. İzleme, portföy ve günlüğün ortak tablo/kontrol/durum bileşenlerini taşı. Route'lar ve DTO'lar korunur.
6. Değişen frontend için lint, coverage, build, kritik akış E2E ve ilgili smoke kontrollerini çalıştır; dar/geniş ekran, klavye, kontrast ve eksik fiyat durumlarını doğrula.

Bu teslim HTML tasarım önerisidir. Üretim runtime'ları değiştirilmez. Doğrulama sonuçları `docs/prototypes/mercek-terminal-visual-review.md` içinde kaydedilir.
