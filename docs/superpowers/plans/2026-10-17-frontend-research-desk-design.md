# Mercek — Araştırma Masası: frontend tasarım önerisi

Tarih: 2026-10-17 · Durum: HTML üzerinden kullanıcı incelemesine hazır tasarım önerisi.

> **Görsel yön revize edildi:** Kullanıcının frontend renk/yapı odaklı düzeltmesi üzerine bu V2 önerisinin görsel kararları `2026-10-17-frontend-visual-terminal-revision.md` ile değiştirildi. Güncel HTML: `docs/prototypes/mercek-terminal-visual.html`. Bu dosya önceki tasarımın karar geçmişidir.

## İstek, kapsam ve başarı ölçüsü

Kullanıcı mevcut frontend'i beğenmiyor; benzer platformların neden öyle tasarlandığını araştırmamızı, çıkarımları kendi ürününe uyarlamamızı, mevcut renklere bağlı kalmamamızı ve uygulamaya geçmeden HTML sunmamızı istedi. Bu çalışma ürün kodunu değiştirmez. Tasarım kararları burada, gezilebilir öneri `docs/prototypes/mercek-research-desk.html` içindedir. Üretim uygulaması için onay değildir.

Ürün bağlamı: kendi kararını veren, ABD hisseleri ve ETF'leri araştıran bireysel yatırımcı. Amaç fiyat hareketi, şirket kanıtı, portföy bağlamı ve kişisel karar kaydını anlaşılır bir sıraya koymak. Başarı: kullanıcı ilk görünümde ana görevi, kaynak dönemini ve eksik veriyi ayırt eder; bir araştırmayı açar, kaynağına gider, izlemeye ekler ve notunu kaydeder. Notlar ve izleme işlemleri yalnız açık HTML oturumunda tutulur.

Okunan yerel dayanaklar: `AGENTS.md`, `SPEC.md`, `docs/spec/current-system/architecture.md`, `docs/spec/current-system/contracts.md`, `docs/agent/verification.md`, `docs/product/PRD.md`, mevcut `App.tsx`, `LeftNav.tsx`, `DashboardHome.tsx`, `index.css` ve 2026-10-15 frontend yol haritası. Mevcut çalışma ağacındaki kullanıcı değişiklikleri korunur.

## Mevcut görünümün teşhisi

- Lacivert yüzeylerin, çizgilerin ve kartların birbirine yakın tonları bilgi hiyerarşisini zayıflatıyor. Ana eylem ile yardımcı verilerin ağırlığı ayrışmalı.
- `DashboardHome` aynı görünümde portföy seçimi, karşılaştırma, benchmark, varlık tablosu, dağılım, haber ve takvim taşıyor. Bunların hepsini aynı anda öne çıkarmak başlangıç görevini bulanıklaştırıyor.
- Bileşenlerde İngilizce/Türkçe ayrıntılar karışabiliyor. Menüden grafik eksenine kadar aynı Türkçe dil gerekli.
- Mevcut beş görevli gezinme mantıklı; görsel kabuk değişirken öğrenilmiş görevler ve URL'ler korunmalı.

Bu teşhis kaynak kodu ve önceki prototip üzerinden yapılan tasarım değerlendirmesidir; kullanılabilirlik araştırması sonucu değildir.

## Platform incelemesi: gözlem → yorum → uyarlama

İnceleme tarihi 2026-10-17. Ücretsiz erişilebilen resmî yardım sayfaları ve ürün ekranları kullanıldı. Hesaba giriş yapılmadı. Aşağıdaki “neden” açıklamaları, platformların beyan etmediği yerlerde bizim tasarım çıkarımımızdır.

| Platform ve doğrulanmış gözlem | Tasarım çıkarımı: neden işe yarayabilir? | Mercek'e uygulanacak karar | Sınır |
|---|---|---|---|
| [Koyfin My Dashboards](https://www.koyfin.com/help/mydashboards-myd/): tablolar, grafikler ve haberler aynı dashboard'da; gruplar bileşenlerin sembol bağlamını bağlayabiliyor. [Resmî ekran](https://www.koyfin.com/help/content/images/2024/06/myd-header.png) görsel olarak incelendi. | Sembol ve soru ekranda kalırken görünüm değiştirmek karşılaştırma maliyetini azaltır. Koyu kabuk, açık analiz yüzeyiyle araç/kanıt ayrımı kurar. | Dar kömür rengi sidebar + açık çalışma yüzeyi. Araştırma sekmeleri değiştiğinde şirket başlığı sabit. Finansal tablo ile grafik aynı kaynağa bağlı. | Widget oluşturucu ve sürükle bırak bu önerinin kapsamına alınmaz; mevcut üründe doğrulanmamış özellik gibi sunulmaz. |
| [TradingView watchlists](https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/): sıralanabilir metrikler, liste bölümleri ve seçilen sembolün ayrıntısına erişim. | Tarama ve derin inceleme ayrı yoğunluk ister. Satırdan ayrıntıya geçiş kullanıcının izlediği şirketi tekrar aramasını önler. | İzleme listesi tablo olarak sunulur; sembol satırı araştırmayı açar. Arama `Ctrl/⌘ K` ile erişilir. Tablo sayıları sağa hizalı ve tabular numerals. | Bu kaynak metinsel olarak incelendi; canlı Supercharts oturumu test edilmedi. Teknik çizim araçları taklit edilmez. |
| [Quartr Pro](https://quartr.com/products/quartr-pro): kaynak referansları ve transkript/belge bağlamı. [Kaynak kartı](https://a.storyblok.com/f/182663/61848/43871038d2/variant-01-pro-chat_sources_min.jpg/m/1920x0/filters%3Aquality%28100%29) ve [belge görünümü](https://a.storyblok.com/f/182663/168629/b1478e485f/variant-01-pro-live_transcripts_audio_min.jpg/m/1920x0/filters%3Aquality%28100%29) görsel olarak incelendi. | Bir iddianın dayanağına yakın olması inceleme yükünü ve yanlış güveni azaltabilir. Sakin belge yüzeyi uzun okumayı destekler. | Her finansal blokta kaynak ve dönem; açılır kaynak ayrıntısı; rapor, çıkarım ve kişisel not görsel olarak ayrılır. | Transkript servisi, belge arşivi ve AI sohbeti mevcut özellik gibi eklenmez. Uydurma analiz veya öneri gösterilmez. |

## Brainstorming: değerlendirilen üç yön

### Benzer açık kaynak projelerin ek incelemesi

Kullanıcının “Benzer projeleri analiz et” yönlendirmesi üzerine ürün sayfalarına ek olarak doğrudan iki projenin dashboard kaynakları okundu. Depolar çalıştırılmadı; değerlendirme aşağıdaki dosyalarda görülen akışlarla sınırlıdır. API dosya ağacı üzerinden commit kimlikleri sabitlendi. Kaynak kodu kopyalanmadı.

| Proje / kaynak | Doğrulanan davranış | Neden / bizim yorumumuz | HTML ve plana etkisi |
|---|---|---|---|
| [Ghostfolio `home-overview.html`](https://github.com/ghostfolio/ghostfolio/blob/b09925eaf1c5b5d5aa568aa88d90cfc097702ac2/apps/client/src/app/components/home-overview/home-overview.html), ayrıca aynı commit'teki `pages/home/home-page.html` | Aktivite sayısı sıfır olduğunda hesap kur → aktivite kaydet → izle sırası sunuluyor. Diğer dalda grafik ve performans var. | Başlangıç akışı ile gerçek verisi hazır kullanım ayrılmalı. Minimalizm, sonraki adım anlaşılıyorsa işlevsel. | Portföy bağlı değilken “0 USD” ve hayalî performans yerine açıklama + sonraki adım. Ana ekranın altında üç görevli araştırma rotası. |
| [Wealthfolio `dashboard-content.tsx`](https://github.com/wealthfolio/wealthfolio/blob/a9177a261253de24f0dcb8799971c1813c2a9e50/apps/frontend/src/pages/dashboard/dashboard-content.tsx), ayrıca aynı commit'teki `portfolio-page.tsx` | Değerleme hatası için ayrı unavailable bayrağı, kaynak zamanı, null getiri için N/A sunumu var. Portföy seçimi yükleme/hata/yeniden deneme dalına sahip; odak modu kontrolü de kullanılıyor. | Büyük sayının anlaşılması için kapsam ve zaman gerekli. Ekran yoğunluğu tercihi bir kontrolle azaltılabilir. | Portföyde değer/getiri/kapsam birlikte `—`. Masaüstünde sidebar'ı kaldıran ve geri getiren odak modu. Fiyat & risk sekmesinde yükleme/hata/kısmi durumları ayrı inceleme. |
| [OpenBB resmî deposu](https://github.com/openbq-org/OpenBB) | Açık kaynak veri platformu ile analist ürünü OpenBB Workspace ayrı tanımlanıyor; depo frontend'in açık kaynak olduğu iddiası taşımıyor. | Veri hazırlama ve sunum ayrımı kaynak bilgisini korumayı kolaylaştırır. | Kanıt, kaynak dönemi ve kişisel not ayrı bölümler. Mevcut Spring → data-service sınırı korunacak; yeni browser → provider bağlantısı önerilmez. |

Ghostfolio ve Wealthfolio portföy takibi bakımından yakındır. Mercek'in şirket kanıtı ve karar günlüğü kapsamını tek başlarına karşılamazlar. Bu yüzden portföy akışları bu projelerden, araştırma bağlamı Quartr/Koyfin'den türetilmiştir. OpenBB'nin kapalı/ayrı Workspace arayüzünün kodu incelenmiş gibi gösterilmez.

### Görsel yön seçimi

1. **Kömür terminal:** tam koyu arayüz, yoğun grid, limon rengi vurgu. Grafik ağırlıklı kullanımda uygun; mevcut görünümden beklenen değişimi yeterince sağlamıyor ve uzun metinleri ikinci plana itiyor.
2. **Araştırma Masası — önerilen:** sıcak açık yüzey, koyu araç kabuğu, bakır vurgu, ölçülü serif başlık ve sade sayısal veri. Şirket araştırması, portföy ve karar günlüğünü aynı dilde birleştiriyor. Kullanıcının mevcut paletten bağımsız yaratıcı yön isteğine doğrudan karşılık veriyor.
3. **Beyaz analitik çalışma alanı:** kompakt üst menü, nötr gri, kobalt vurgu, bütünüyle sans tipografi. Yoğun tablo için güçlü; daha sıradan bir kurumsal SaaS görünümü ve daha zayıf ürün kimliği oluşturuyor.

Öneri 2 seçildi. Bu seçim kullanıcı onayı bekleyen tasarım önerisidir; tercih henüz üretim kararı değildir.

## Karar kaydı

| ID | Karar | Gerekçe / uygulama |
|---|---|---|
| D01 | Açık tema ana yön. Canvas `#F3F1EA`, panel `#FCFBF7`, sidebar `#202522`. | Çalışma alanı ile araçları ayırır; mevcut lacivert sistemden belirgin biçimde farklıdır. |
| D02 | Bakır `#A4472C` ana vurgu; koyu yeşil `#2F6350` ikincil veri serisi. | Bakır yalnız ana eylem/seçim için; yeşil grafik serisi etiketiyle kullanılır. Artış/azalış yalnız renge bağlanmaz. |
| D03 | Georgia serif büyük başlıklar; Segoe UI / sistem sans arayüz; tabular numerals sayılar. | Kimlik başlıkta, okunabilirlik kontrol ve tablolarda. Haricî font/CDN olmadan çevrimdışı açılır. |
| D04 | 208px sidebar, 72px üst bar, 32px içerik boşluğu, 8px panel köşesi. | İnce çizgi ve boşluk hiyerarşi kurar. Kartların hepsi gölgeli ve aynı ağırlıkta değildir. |
| D05 | Bugün ekranında tek baskın araştırma alanı; sağda portföy bağlamı. | Kullanıcıya önce bir iş gösterir; bütün analiz araçlarını ilk ekrana yığmaz. |
| D06 | Araştırmada Genel Bakış / Finansallar / Fiyat & Risk sekmeleri. | Başlık ve şirket kimliği sabit, ayrıntı talebe göre. Mevcut analiz yeteneklerinin sonraki uygulama aşamasında yerleşeceği yüzey. |
| D07 | Kaynak, dönem, veri türü metriklerin yanında. | FY2025 raporu güncel fiyat veya en son rapor iddiası taşımaz. Fiyat, risk, portföy boşlukları görünürdür. |
| D08 | Beş görev aynı: Bugün, Araştır, İzleme Listem, Portföy, Günlük. | Mevcut route sözleşmelerini ve zihinsel modeli korur; büyük ekran/mobil aynı görevleri sunar. |
| D09 | Mobilde tek kolon, beş görevli alt menü, kaydırılabilir finansal tablo. | Portföy durumu içerikte kalır. Gezinme veya uzun şirket adı sayfayı yatay taşırmaz. |
| D10 | Tasarım gerekçeleri ayrı görünümde, ürün ekranında araştırma metinleri yok. | Kullanıcı prototipi günlük kullanım arayüzü gibi değerlendirebilir; kararların nedenine isteyince ulaşır. |
| D11 | Yeni özellik iddiası yok. | Screener, Portfolio Fit, Decision Card, transkript ve AI sohbeti çalışan ürün gibi gösterilmez. |
| D12 | Tasarım HTML'i tek dosya, yerel CSS/JS/SVG; ağ isteği yok. | Doğrudan açılabilir ve paylaşılabilir. Yalnız kullanıcı kaynak bağlantısına basarsa dış site açılır. |
| D13 | Masaüstünde açılıp kapatılabilir odak modu. | Wealthfolio'nun kodunda görülen odak kontrolü ve Ghostfolio'nun minimalist yaklaşımıyla uyumlu. Kullanıcı tek şirketi okurken sidebar alanını geri kazanır; görünür “Odaktan çık” kontrolüyle geri döner. Mobil menü korunur. |

Bu öneri, 2026-10-15 planındaki lacivert/mavi görsel yönün alternatifidir. O plandaki veri doğruluğu, erişilebilirlik ve sözleşme koruma koşulları geçerlidir. Mevcut `index.css` değiştirilmez; tasarım onaylanırsa uygulama aşamasında tek token kaynağı o dosya olacaktır.

## HTML'de görülecek içerik ve sınırlar

- **Bugün:** resmî Microsoft raporundan örnek finansal grafik, bağlı olmayan portföy durumu, araştırma adımları ve kaynak erişimi.
- **Araştır:** Microsoft bağlamında üç sekme, yıllık gelir/net kâr grafiği ve erişilebilir veri tablosu. Fiyat/risk sekmesi verinin bağlı olmadığını açık gösterir.
- **İzleme:** kullanıcı HTML'de MSFT'yi eklediğinde oturumluk satır oluşur; güncel fiyat uydurulmaz. Satır araştırmaya açılır.
- **Portföy:** bağlı olmayan portföy, değer ve getiri için `—`, ürünün ileride bağlayacağı işlem akışı açıklaması. Bu durumda varlık yok veya portföy sıfır iddiası kurulmaz.
- **Günlük:** kullanıcının yazdığı metin açık oturumda kaydedilir; reload sonrasında korunacağı iddia edilmez.
- **Tasarım kararları:** üç alternatif, kaynak/gözlem/uyarlama karşılaştırması, palet ve ilerleme planı.

Gerçek içerik kaynağı: [Microsoft 2025 Annual Report](https://www.microsoft.com/investor/reports/ar25/index.html), Income Statements / Financial Review. 30 Haziran'da biten FY2023/2024/2025, milyon USD. Gelir: 211915 / 245122 / 281724. Net kâr: 72361 / 88136 / 101832. FY2025 faaliyet kârı: 128528. Seyreltilmiş EPS: 13,64 USD. Kaynakta raporlanan yıllık gelir büyümesi %15'tir. Grafik milyar USD gösterir; tablo tam milyon USD değerlerini korur. Bunlar portföy verisi veya bugün için bir alım/satım önerisi değildir.

## Onaydan sonra üretime taşıma planı

1. **Tasarım yönü incelemesi:** HTML'de görsel dil, ekran yoğunluğu ve araştırma/portföy dengesi kullanıcı tarafından değerlendirilir. Düzeltmeler önce bu prototip ve karar kaydına işlenir.
2. **Token ve kabuk:** `index.css`, `TopBar`, `LeftNav`. Mevcut route'lar ve deep link'ler korunur. Tipografi, odak ve responsive kurallar tek kaynaktan gelir.
3. **Ortak veri sunumu:** kaynak/dönem/kapsam satırı, statü ve boş/hata/yükleme blokları; mevcut DTO'larla eşleşme. Yeni veri alanı gerekiyorsa mevcut sayılmaz, ayrı sözleşme işi açılır.
4. **Bugün ve Araştır:** `DashboardHome`, `ChartWorkspace` yerleşimleri; fiyat grafiklerinin gerçek API verisiyle taşınması. HTML'deki Microsoft snapshot'ı üretime varsayılan veri olarak kopyalanmaz.
5. **İzleme, Portföy, Günlük:** mevcut kalıcı işlemler ve hata davranışları yeni yüzeye bağlanır. Prototipteki oturumluk davranışlar üretim kalıcılığının yerine geçmez.
6. **Gerekli doğrulama:** frontend lint, coverage, build; route ve kritik akışlar için E2E. Masaüstü/mobil, klavye, kontrast, metin taşması, eksik fiyat ve kısmi portföy smoke senaryoları. Diğer runtime'lar yalnız değişiklik varsa kendi zorunlu kontrollerini çalıştırır.

Üretime geçiş bu teslimin kapsamı dışındadır; kullanıcı önce HTML önerisini görür.

## Prototip doğrulaması

Doğrulama sonuçları `docs/prototypes/mercek-research-desk-review.md` dosyasına, bağımsız HTML için fresh komut çıktısı ve ekran görüntüleriyle kaydedildi. Son koşuda 15 kontrol grubu geçti. Ürün runtime'ları bu çalışmada değiştirilmediği için uygulama testlerinin geçtiği veya release hazır olduğu iddia edilmez.

Mobil grafikte eksen ve gelir etiketleri büyütüldü. Kalabalığı azaltmak için net kârın çubuk üstü etiketleri dar ekranda gizlenir; serisi ve lejandı kalır. Kesin değerler kaynak penceresindeki erişilebilir tabloda ve grafiğin metinsel açıklamasında bulunur. Otomatik kontrast kontrolünün bulduğu adım numarası rengi düzeltildi.
