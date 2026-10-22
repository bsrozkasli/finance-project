# Frontend ürün deneyimi ve üretim planı

**Revizyon:** 2026-10-16  
**Durum:** İlk üretim dilimi uygulanıyor; tamamlananlar ve kalan işler aşağıda kayıtlıdır.

## Amaç ve karar yetkisi

Finance Project'in yatırım araştırması akışını güvenilir, kolay öğrenilen ve uzun süre kullanılabilir bir çalışma alanına dönüştür. İlk bakışta kullanıcının sonraki adımı, mevcut kanıtın kapsamı ve eksikliği anlaşılmalı. Karar yolculuğu PRD'deki Discover → Research → Analyze → Portfolio Fit → Decide → Monitor hedefini izler; henüz uygulanmamış screener, Decision Card ve Portfolio Fit mevcut işlev gibi sunulmaz.

Kullanıcı 2026-10-16'da görsel kararları ekibe bıraktı ve Stitch bağımlılığını kaldırdı. **Üretim kaynağı çalışan React uygulaması, bu kararlar ve repo içindeki tasarım tokenlarıdır.** Stitch yalnızca isteğe bağlı konsept/inceleme aracıdır. Ekranının yokluğu işi durdurmaz, ürettiği HTML doğrudan ürüne kopyalanmaz. Mevcut tarayıcı yolları ve Spring API sözleşmeleri korunur.

## Üç uzmanlı karar oturumu

| Uzman | Karar | Gerekçe |
|---|---|---|
| Ürün ve UX | Navigasyon: **Bugün, Araştır, İzleme Listem, Portföy, Günlük**. İlk oturum: sembol ara → kanıtları incele → izlemeye ekle. | Mevcut menü özelliklere bölünmüş; kullanıcı hedefi ve sonraki adım kayboluyor. |
| Görsel tasarım | Sakin koyu lacivert yüzeyler, tek mavi ana vurgu, Inter arayüz ve JetBrains Mono sayısal alanlar. İlk ekranda bir baskın araştırma eylemi. | Okunabilirlik ve taranabilirlik; finansal yoğunluğu ayrıntı ekranında koruma. |
| Frontend mimarisi | URL ve DTO'ları koru; tek token sistemi kur; önce veri doğruluğunu düzelt, sonra kabuğu ve ekranları değiştir. | Güzel görünen yanlış veri, güveni artırmak yerine hatayı büyütür. |

**Uzlaşı:** İlk somut tasarım “Bugün” ekranı. Prototip statik ve açıkça veri bağlanmamış. Üretim tasarımı, yalnızca gerçek API sonucunu ve açık boş/kısmi/hata durumlarını gösterir.

## Tasarım sistemi kararı

- Üretim arayüzünün dili Türkçedir. Menü, eylem, boş/kısmi/hata durumları ve erişilebilirlik etiketleri aynı Türkçe terim sözlüğünü kullanır; sembol, kaynak adı ve yerleşik finansal kısaltmalar gerektiğinde özgün biçimini korur.
- Renk: canvas `#0B1220`, surface `#111C2E`, elevated `#19263B`, border `#2A3A52`, primary text `#F2F6FC`, secondary text `#AAB8CB`, accent `#6EA8FE`, positive `#50D6A3`, negative `#FF7A86`, caution `#F6C464`. Gerçek bileşende kontrast ayrıca ölçülür.
- Tipografi: Inter (yerel/system fallback), sayısal veri için JetBrains Mono (fallback monospace), tabular numerals. Sürekli metin en az 12px; gövde 14–16px; sayfa başlığı 28–32px.
- Ölçüler: 4px tabanlı ritim (4/8/12/16/24/32), 12px kart ve 8px kontrol köşesi; masaüstünde yaklaşık 240px sidebar, 64px topbar, en çok 1440px içerik ve 12 kolon. Mobilde tek kolon ve en az 44px dokunma hedefi.
- Etkileşim: `:focus-visible` halkası, semantik kontroller, açık etiketler, klavye ile modal odak yönetimi, azaltılmış hareket tercihi. Olumlu/olumsuz/eksik durum yalnız renkle anlatılmaz.
- Her finansal blokta mümkün olan kaynak, gözlem zamanı ve kapsam bilgisi verinin yanında bulunur. Zaman bilinmiyorsa “zaman bilgisi yok” denir; otomatik “canlı” etiketi kullanılmaz.

## Bilgi mimarisi ve route eşlemesi

| Görünür görev | Mevcut yol | Kullanıcı amacı |
|---|---|---|
| Bugün | `/dashboard` | Portföy/veri durumunu gör ve tek sonraki adıma geç |
| Araştır | `/workspace` | Sembol seç ve grafik/kanıtları incele |
| İzleme Listem | `/watchlist` | Kaydedilen adayları tekrar değerlendir |
| Portföy | `/portfolio` | Pozisyonları ve ledger durumunu incele |
| Günlük | `/journal` | Karar ve işlemleri kaydet/incele |

`/news`, `/reports`, `/transactions` ve parametreli yollar doğrudan bağlantılar için çalışmaya devam eder; Araştır veya Portföy bağlamından erişilir. Mobilde ilk dört görev alt gezinmede, Günlük Portföy içinden görünür olur. Ekranlar arasında seçili sembol ve portföy korunur.

## Uygulama dilimleri

### 1. P0 — Finansal doğruluk ve eylem dürüstlüğü

- `App.tsx`: fiyat geçmişi bulunmayan kayıtlı varlığı listeden düşürme; varlık kimliği ve fiyat durumunu ayır.
- `DashboardHome.tsx` ve `AiReportsView.tsx`: maliyet fiyatını güncel fiyat yerine koyma. Kısmi toplamın kapsamını ve hesaplanamayan değeri açık göster.
- `AiReportsView.tsx`: mevcut sözleşmede olmayan `/api/gemini/portfolio-report` çağrısını ve sabit model iddiasını kaldır; yalnız desteklenen raporu sun.
- `TopBar.tsx`: sabit “MARKET CLOSED” ve “FEED ACTIVE” iddialarını gerçek kaynağa bağla veya kaldır.
- `SettingsModal.tsx`: gerçek fiyat akışını etkilemeyen oynaklık kontrolünü kaldır.
- Ledger işleminden sonra yerel holdings tahminini otorite sayma; sunucu sonucunu yeniden yükle, başarısızlığı göster ve yeniden denemeyi mümkün kıl.
- Kabul: Eksik/boş/hatalı sağlayıcı sonucu varlığı silmez, fiyat ya da getiri uydurmaz, başarısız işlem başarı gibi görünmez.

### 2. P1 — Odaklı kabuk ve ilk oturum

- Tek `index.css` token kaynağına geç; mevcut bileşenleri yeni semantik tokenlarla taşı.
- Beş görevli navigasyon, sade üst bar, arama, “Bugün” ekranında bir ana eylem, portföy veri kapsamı ve izleme boş durumunu uygula.
- Dar/geniş ekran, klavye ve ekran okuyucu akışını doğrula. Dashboard → Araştır → İzleme geçişinde sembol bağlamı korunur.
- Kabul: Kullanıcı ilk ekrandan araştırmaya tek açık eylemle gider; kritik veri durumu hiçbir viewport'ta gizlenmez.

### 3. P2 — Araştırma ve diğer ekranlarda tutarlılık

- Kaynak/zaman/kapsam satırı, boş/kısmi/hata/yükleniyor durumları, finansal biçimlendirme, tablo ve form kalıplarını ortaklaştır.
- Araştırmada sembol, grafik ve kanıt bölümleri; eksik kanıtlar görünür. AI anlatısı sayısal kanıtın yerine geçmez.
- İzleme, portföy, günlük, haber ve rapor ekranlarında aynı durum dili ve erişilebilir eylemler kullanılır.
- Kabul: Her boş/hata görünümü nedenini ve uygulanabilir sonraki adımı açıklar; URL sözleşmeleri çalışır.

### 4. P3 — Performans ve üretim doğrulaması

- Ağır route'ları ihtiyaç anında yükle; ilk JS paketini ölçerek küçült.
- `npm run lint`, `npm run test:coverage`, `npm run build` ve ilgili `npm run e2e` akışlarını taze sonuçlarla çalıştır. Backend hazırsa `docs/agent/verification.md` içindeki ilgili smoke senaryolarını uygula.
- Klavye, erişilebilirlik, 375/768/1440px taşma ve sağlayıcı kesintisi durumlarını doğrula. Testlerde canlı finansal sağlayıcı çağırma.
- Kabul: Değişen akışlar test kanıtıyla geçer; ilk yükleme ve dar ekran sorunları ölçülüp giderilir. Bu, dış kullanıma açılma kapılarını tek başına karşılamaz.

## Teslim ve inceleme

Her dilim ayrı incelenebilir frontend PR'ı olur. İlişkisiz çalışma ağacı değişiklikleri korunur. Prototip kaynak gerçekliği veya üretim bitişi kanıtı değildir. Stitch konsepti: `projects/17896731318476695035` (“Finance Project · Evidence Workspace Concept”); yerel bağımsız örnek: `docs/prototypes/frontend-evidence-workspace.html`; masaüstü ve mobil görseller: `docs/prototypes/frontend-evidence-{desktop,mobile}.png`.

## Uygulama kaydı — 2026-10-16

- P0: Eksik güncel fiyat için portföy toplamı bilinmiyor olarak gösteriliyor; fiyatlanan kapsam ve ara toplam ayrılıyor. Eski raporun sözleşmede olmayan portföy çağrısı kaldırıldı. Üst bardaki piyasa/akış iddiaları, ayarlardaki etkisiz oynaklık kontrolü ve araştırma ekranındaki sahte hata/çizim kontrolleri kaldırıldı. Ledger işlemleri sonrası sunucu verisi yeniden yükleniyor; işlem hatası modalda kalıyor.
- P1: Türkçe beş görevli gezinme, mobil alt gezinme, sade arama ve odaklı Bugün girişi uygulandı. Renk ve tipografi tokenları `frontend/src/index.css` içinde. Arama fiyatı bulunmayan kayıtlı varlığı da kimliğiyle gösteriyor.
- P2: Rapor, izleme, portföy, günlük ve haber ekranlarının üst düzeyi güncellendi; `/workspace/:symbol` sembolü açıyor. Eski ayrıntı panellerinin tamamında Türkçeleştirme, ortak kaynak/zaman/kapsam sunumu ve modal etkileşimlerinde tutarlılık halen açık.
- P3: Route ve büyük modal bileşenleri parçalı yükleniyor. İlk JS paketi uygulama öncesi 657.96 kB iken son ölçümde 252.65 kB. Frontend lint, test, derleme ve tarayıcı smoke sonuçları teslim raporunda taze kanıtla kaydedilir. Gerçek backend ve canlı sağlayıcılarla entegre smoke bu dilimde çalıştırılmadı.

Bu çalışma henüz tam ürün yayını veya P0–P3 kapsamının bütünü olarak yorumlanmaz. Yeni endpoint ya da DTO alanı eklenmedi. Bir sonraki dilim, kalan İngilizce ayrıntıları ve ortak durum bileşenlerini kapatıp entegre smoke koşullarını sağlar. Her PR değişen dosyaları, çalıştırılan kontrolleri ve açık kalan riski bildirir.

## Uygulama kaydı — 2026-10-22

Dal `feat/frontend-desk-completion`. P2'nin kalan kısmı ve Dark Council planının 3. bölümü:

- Bugün: tek `h1`, özet sırası Güncel değer / Maliyet / Fiyat kapsamı / Toplam kâr-zarar; güncel toplam bilinmiyorsa "Fiyatı bulunan pozisyonların ara toplamı" ayrı etiketle gösterilir. Boş karşılaştırma kayıp renginde gösterilmez.
- Haberler: akışta olmayan yayıncıları kaynak gibi gösteren sabit liste kaldırıldı; yalnız akıştaki kaynaklar ve başlık sayıları listelenir.
- Portföy çekmecesi: tarayıcı `alert`/`confirm`/`prompt` yerine çekmece içi hata, durum ve satış onayı; fiyat bilinmeden sabit `132.85` maliyet önerilmez; adlandırılmış dialog ve Escape.
- İşlem günlüğü: bilinmeyen kâr/zarar ve ortalama getiri `0` yerine `—`; portföyü bilinmeyen işlem için "Technology Portfolio" yerine "Portföy bilinmiyor".
- Türkçeleştirme: Bugün, Haberler, Portföy, İzleme Listem, Günlük, işlem günlüğü dialogu, grafik notu, kullanıcıya ulaşan hook hata mesajları. Durum dili: Yüklenemedi / Veri yok / Kısmi veri / Yetersiz geçmiş.
- Doğrulama: `npm run lint`, `check:api-boundaries`, `test:coverage` (25 dosya / 158 test), `build`, `check:bundle` (686.5 KiB ham JS), `npm run e2e` (15 geçti, 12 entegre test atlandı) ve 320/1440px'te Bugün, Portföy, İzleme Listem, Haberler, Günlük için yatay taşma 0. Entegre E2E (gerçek backend) CI'da çalışır; yerelde çalıştırılmadı.

Açık kalanlar: `StockDetailModal` ile `useSmartReport`, `useAssetResearchDetail`, `useMarketOverviewData`, `useWatchlistResearchSnapshot` İngilizce metinleri açık PR'lar (#45, #46, #49) birleşince çevrilecek; tarihler hâlâ İngilizce ay adlarıyla biçimleniyor; günlük formu, piyasa fiyatı yokken API'ye `currentPrice` olarak alış fiyatını gönderiyor (sözleşme kararı gerektirir).

Güncelleme — 2026-10-22, dal `feat/frontend-turkish-research-copy`: `StockDetailModal` ve dört hook Türkçeleştirildi; modal adlandırılmış dialog oldu ve Escape ile kapanıyor. Aynı dilimde üç gösterim hatası düzeltildi: günlük değişim yüzde puanı iki kez 100 ile çarpılıyordu; sağlayıcı hedef fiyat göndermediğinde `$0.00` hedef ve `-100%` potansiyel gösteriliyordu; 52 haftalık aralık bilinmiyorken konum `0%` olarak çiziliyordu. Tarih biçimi ve `currentPrice` kararı açık kalıyor.

Güncelleme — 2026-10-22, dal `feat/frontend-turkish-dates`: tarihler `tr-TR` biçiminde (`9 Tem 2026`); Portföy dağılım modları Türkçe (Günlük getiri / Toplam getiri / Ağırlık). Para tutarları `$1,234.56` biçiminde kalır. Açık kalan: `currentPrice` sözleşme kararı.
