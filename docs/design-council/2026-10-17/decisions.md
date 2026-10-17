# Tasarım kurulu karar kaydı — 17 Ekim 2026

Bu belge üç ayrı agent’ın bağımsız açılış, çapraz tartışma ve ortak pusula oylamasından çıkan **güncel kurul önerisini** kaydeder. Kullanıcının ürün onayı, üretim uygulaması veya yeni işlevlerin tamamlandığı anlamına gelmez. Önceki V3 görsel yönünün yerine bu oturumdaki öneri esas alınır; eski plan ve prototipler tarihsel kayıt olarak değiştirilmez.

Sayım otoritesi [vote-results.json](vote-results.json) dosyasıdır. Görsel, İş akışı ve Etkileşim agent’ları toplam 54 oy kullandı; moderatörün oyu yoktur. On sekiz karardan 16’sı oybirliğiyle, D03 ve D14 ise 2–1 çoğunlukla alındı. Her maddenin kazananı pusulanın A seçeneğidir. Tablodaki üç oy sırası **Görsel / İş akışı / Etkileşim**; A/B harfleri katılımcıyı değil seçeneği belirtir. Bütün bireysel gerekçeler ve çekinceler [görsel](votes-visual.json), [iş akışı](votes-workflow.json), [etkileşim](votes-interaction.json) dosyalarında tam olarak korunur. Aşağıdaki özet onların yerine geçmez.

Görsel dayanak TIKR, Koyfin ve sonradan eklenen Stock Rover’ın gerçekten açılıp incelenen resmî ekranlarıdır; TradingView ikincil karşılaştırmadır. Fiscal.ai erişim engeli nedeniyle arayüzü görülmüş gibi değerlendirilmez. Referanslar finansal veri doğruluğu veya ürün yetenekleri için örnek alınmamıştır: karşılaştırılan konular şirket başlığı, kontrol sırası, tablo hiyerarşisi ve grafik alanıdır. Koyfin’in tarihsel görüntüsü bugünkü uygulamanın denetimi sayılmaz. Referanslardaki sayılar kullanıcı portföyüne aktarılmaz. Bu sınır, özellikle dolu bir ekranı görsel olarak cazip göstermek için fiyat, getiri, kaynak veya AI sonucu üretme eğilimini önler. Tasarımın asıl sınavı, kanıt eksildiğinde de yerleşimin anlaşılır kalmasıdır.

## On sekiz kararın uygulama karşılığı

| ID | Kazanan ve üç oy | Nerede uygulanacak, neden | Karşı oy ve korunan çekince |
|---|---|---|---|
| D01 | A · açık veri/açık canvas · A/A/A | Bütün tablo ve rapor yüzeylerinde uzun okumayı destekler. | Karşı oy yok; karanlık ortamda parlaklık farkı değerlendirilir. |
| D02 | A · kobalt `#2458D3` · A/A/A | Seçimler ve ana kayıt eylemleri; amber veri uyarısına ayrılır. | Karşı oy yok; renk tek başına kimlik değildir, kontrast ölçülür. |
| D03 | A · grafit üst ve sol kabuk · A/B/A | Beş görev, şirket araştırması kontrollerinden ayrılır. | İş akışı açık menüyü savunur: koyu bloğu gereksiz baskın bulur. Görsel sakin geçiş avantajını, Etkileşim baskınlaşma riskini kabul eder. |
| D04 | A · 40px / isteğe bağlı32px · A/A/A | Finansal ve liste tabloları; okunurluk ile yoğunluk kullanıcı seçimine bırakılır. | Karşı oy yok; daha az satır görünür, mobil hedefler kompakt satıra sıkıştırılmaz. |
| D05 | A · kapalı başlayan uyarlanır panel · A/A/A | Kalıcı kaynak/dönem/birim satırı; yeterli genişlikte isteğe bağlı280px panel. | Karşı oy yok; viewport≥1440px **ve** kalan tablo≥900px birlikte gerekir. Diğer durumda modal çekmece; odak davranışları farklıdır. |
| D06 | A · portföy öncelikli Bugün · A/A/A | Durum→performans/dağılım→pozisyonlar→haber/takvim; makro kısa şerit. | Karşı oy yok; portföysüz kullanıcıya anlamlı oluşturma ve araştırma erişimi gerekir. |
| D07 | A · altı sekme, Grafik ikinci · A/A/A | Araştırmanın kanıt türleri açık sırayla ayrılır. | Karşı oy yok; finansallara derin erişim korunur, teknik sinyal akışına kayılmaz, dar ekran devamı görünür olur. |
| D08 | A · Genel bakış başlangıcı · A/A/A | Hisse ve ETF için ortak giriş; seçilen görev ana yüzeyi alır. | Karşı oy yok; tekrarlı KPI kartlarıyla şişmez, doğrudan bölüm bağlantısı korunur. |
| D09 | A · formda en çok1primary · A/A/A | Kayıt baskın, gezinme bağlantı, ekleme ikincil, silme nesnesi açık. | Karşı oy yok; primary bulunmayan ekranın bağlantıları bulunabilir kalır. |
| D10 | A · “Kayıtlı varlıklarda ara” · A/A/A | Üst arama; gerçek kapsam kontrol açılmadan anlaşılır. | Karşı oy yok; metin girişini kısayol kesmez, kapsam gerçekten değişirse label yenilenir. |
| D11 | A · Güncel değer/Maliyet/Fiyat kapsamı · A/A/A | Portföy ve Bugün; maliyet fiyat yerine geçmez. | Karşı oy yok; zaman, kapsam türü ve bilinen ara toplam açıklanır; ara toplam toplam gibi sunulmaz. |
| D12 | A · 14/13/12px; şirket26/panel16px · A/A/A | Gövde, tablo ve yardımcı metin; kaynak bilgisi okunur kalır. | Karşı oy yok; başlık esner, büyütmede taşma olmaz, yoğunluk için yazı küçültülmez. |
| D13 | A · 192/56/24/16px ölçüler · A/A/A | Menü/üstbar/kenar/panel arası; panel6px, kontrol4px köşe. | Karşı oy yok; 192px menü tablo alanında izlenir, küçük ekrana sabit taşınmaz; gölge yalnız üst katmanda. |
| D14 | A · “Taslağı önizle” · A/A/B | Prototip Günlük formu; başarı bildirimi yerine önizleme. | Etkileşim “Taslağı bu oturumda göster” ve açık yenileme kaybını tercih eder. Görsel önceki “saklandı” dilinden vazgeçer; silinme bilgisi görünür kalır. |
| D15 | A · beş görev görünür alt menü · A/A/A | Mobil ana gezinme; Günlük eşit erişimde kalır. | Karşı oy yok; 320px’de uzun Türkçe etiketler ve hedefler ölçülür. |
| D16 | A · altı rol sabit sırada · A/A/A | Son AI sekmesi; rapor yapısı anlaşılır. | Karşı oy yok; rol başlıkları gerçek sonuç veya canlı telemetri değildir; sahte ilerleme/rapor olmaz. |
| D17 | A · nesneyi adlandıran eylemler · A/A/A | “İzleme listesine ekle”, “Kaynak ayrıntıları”, “İşlem kaydı ekle”. | Karşı oy yok; mobilde küçük yazı, belirsiz ikon veya kısaltmayla çözülmez. |
| D18 | A · HTML Araştır/Genel bakış açılışı · A/A/A | Kaynaklı tarihsel rapor kesitiyle dolu yüzeyin tasarımı değerlendirilir. | Karşı oy yok; canlı hesap/fiyat değildir, gerçek ürünün Bugün varsayılanı değişmez, Bugün erişilebilir kalır. |

## Beş ana sayfa ve altı sekmenin haritası

**Bugün** (`/dashboard`) portföy durumunu başlatır. Güncel değer, maliyet ve fiyat kapsamının ardından performans/dağılım, pozisyonlar, haber/takvim gelir. Piyasa ve makro bağlamı kısa tutulur. Portföy yoksa oluşturma eylemi; varsa incelemeye götüren bağlantı anlamlı sonraki adımdır. Haberlerden otomatik tez değişimi veya öncelik puanı türetilmez. Eksik veri yüzünden bilinmeyen toplam, dekoratif bir sayıyla doldurulmaz.

**Araştır** (`/workspace`, `/workspace/:symbol`) şirket veya fon kimliğini korur. Altı bölüm sırası **Genel bakış / Grafik / Finansallar / Risk / Haberler / AI raporu** olarak önerilir. Genel bakış doğrulanmış kimlik, temel metrik ve uygun bağlamı toplar. Grafik fiyat geçmişi, mevcut görünüm türleri ve teknik göstergelere alan verir. Finansallar dönemleri karşılaştıran geniş tablodur; her sekmenin üstünde büyük fiyat grafiği kalmaz. Risk, mevcut hesapların koşullarını ve yetersiz geçmişini açıklar. Haberler sembol bağlamını korur. AI raporu; Temel, Teknik, Risk, Boğa, Ayı ve Portföy Yöneticisi sırasını gösterir. Bu gruplama mevcut bütün araçların bugün aynı workspace içinde çalıştığı iddiası değildir.

**İzleme Listem** (`/watchlist`) liste seçimi, sembol ekleme ve geniş araştırma tablosuna dayanır. Sembol araştırmaya bağlanır; fiyat, zaman ve bölüm bazlı veri durumu birlikte okunur. Kalıcı sağ panel varsayılan değildir. **Portföy** (`/portfolio`, mevcut kimlikli rota) özet, pozisyon ve işlem kaydı görevlerini bir araya getirir; mevcut `/transactions` bağlantısı korunur. İşlem kaydı emir yürütme gibi sunulmaz. **Günlük** (`/journal`) mevcut kalıcı kayıt akışını temsil eder. Prototipte yazılan metin yalnız açık oturum taslağıdır; “Prototip taslağı — yalnız bu açık oturumda tutulur” açıklaması ve “Taslağı önizle” eylemi bulunur. Yenilemede silinmesi açık kalır.

Mevcut haber ve rapor derin bağlantıları da korunur. Şirket gelir tablosu ETF’ye zorla uygulanmaz; desteklenmeyen fon kanıtı eksik olarak belirtilir. Screener, Decision Card, Portfolio Fit, genel AI sohbeti ve transkript gibi hedefler bu öneride çalışan yetenek değildir. İleride gösterilecekse **GELECEK** olarak ayrılır. Yeni endpoint, DTO veya kalıcılık yeteneği bu kurul kararıyla oluşmaz.

## Üretime geçiş sırası

Önce bağımsız HTML’de palet, boş/dolu yüzey, sekmeler ve kontrol davranışları somutlaştırılır; aynı üç katılımcı kendi alanından inceler. İncelemede bulunacak kusurlar, oylama sonucunu sessizce değiştirmeden giderilir. Yeni tasarım tercihi gerekiyorsa hangi karardan saptığı kayda geçirilir. Prototip doğrulaması gerçek sunucu entegrasyonu veya ürün onayı olarak raporlanmaz.

Sonraki uygulama çalışması, kullanıcı bu yönü seçtiğinde görev dalında ve mevcut değişiklikleri koruyarak kapsamlanır. İlk dilim `frontend/src/index.css` tokenları, üst bar ve görev menüsüdür. Ortak tablo, buton, kaynak satırı ve veri durumları mevcut bileşenlerden geliştirilir. İkinci dilim Bugün ve Araştır yerleşimi; üçüncü dilim izleme, portföy ve günlüğün tutarlı yüzeyleridir. Statik rapor kesiti üretim veri kaynağına dönüştürülmez; gerçek API alanlarıyla eşleme yapılır.

Entegrasyonda loading, empty, unavailable, partial, stale ve insufficient-history ayrımı korunur. Fiyat eskiliği mevcut zaman damgasına dayanır; DTO’da olmayan doğrulanmış bir bayrak icat edilmez. Eksik güncel fiyatta toplam bilinmiyor kalır, fiyatlı ara toplam ayrı sunulur. Maliyet güncel değerin yerine konmaz. AI başarısızlığı anlatı veya karar üretmez; çalışan araştırma bölümleri kullanılabilir kalır.

Uygulama değiştiğinde [doğrulama sözleşmesi](../../agent/verification.md) izlenir: frontend lint, coverage ve build; kritik rotalar ve akışlar için E2E, değişen alana uygun smoke senaryoları çalıştırılır. Kaynak panelinin 1440/900 eşikleri, dar/geniş ekran taşması, 320px menü, metin büyütme, klavye odağı ve gerçek kontrast çiftleri ayrıca incelenir. Otomatik testlerde canlı finansal sağlayıcı çağrılmaz. Bugünkü karar dosyası bu kontrollerin geçtiğini iddia etmez; taze sonuçları teslimin doğrulama kaydı taşıyacaktır.
