# Üç agent frontend tasarım kurulu — tam görüşme kaydı
Bu dosya ortak moderatör çağrıları ile agentların ilettikleri görüşleri tur sırasıyla değiştirmeden birleştirir. Kaynak dosyalar ayrı tutulur. Karşı oylar ve çekinceler korunur.
Üç ayrı agent, 54 oy, 16 oy birliği, 2 çoğunluk kararı; moderatör 0 oy.

---

## Moderatör · oturum protokolü ve ortak brief

Kaynak: `00-protocol.md`

# Frontend tasarım kurulu — oturum protokolü

Kullanıcı isteği: “3 tane ayrı agent olarak nerede ne kullanılmalı neden şeklinde bir tartışma yarat ve oylama yap; renklerden button, sayfa yapısı, label'lara kadar istişare; kararlardan sonra HTML prototip ve bütün görüşleri/görüşmeleri ortaya koy.”

Tarih: 2026-10-17. Çıktı bir tasarım önerisi ve bağımsız HTML prototipidir. Üretim uygulamasına geçiş değildir.

## Gerçek katılımcılar

| Kod | Ayrı agent görevi | Sorumluluk |
|---|---|---|
| A | `/root/visual_council` | Görsel dil, palet, tipografi, kimlik ve alan ağırlıkları |
| B | `/root/workflow_council` | Yatırımcı akışı, sayfa mimarisi, tablo/grafik ve finansal veri |
| C | `/root/interaction_council` | Buton/etiket/durum dili, klavye, mobil ve erişilebilirlik |
| M | `/root` | Moderasyon, kanıt paylaşımı, oy sayımı, prototip ve doğrulama; oy kullanmaz |

Bu üç katılımcı gerçekten ayrı agent olarak çalıştırıldı. İnsan uzman görüşmesi veya dış şirketlerle iletişim yapılmadı. Her katılımcının ilettiği tasarım görüşleri dosyalarda tam olarak korunur; karşı görüşler ve moderatör soruları ayrı tur dosyalarıdır.

## Ortak brief

- Kullanıcı mevcut frontend'i beğenmiyor. Yeni palet serbest; görsel benzerlik ve araştırma kullanımına uygunluk gerekli.
- Kapsam ABD hisse/ETF kişisel yatırım araştırması: temel/teknik/risk, haber/makro, portföy, izleme, günlük ve mevcut ardışık AI analist raporları.
- Mevcut beş ana görev, URL ve API sözleşmeleri korunur. Mevcut özellikler yeniden gruplanabilir; önerilen gruplama bugün tek workspace'te uygulanmış gibi sunulmaz.
- Eksik fiyat, değer, getiri veya AI çıktısı üretilmez. Maliyet güncel değer değildir. Kaynak/dönem/kapsam görünürdür.
- Görsel kıyas ürünün iç uygulama ekranlarından yapılır. Erişilemeyen dashboard incelenmiş sayılmaz. Platformların tasarım nedenleri bizim çıkarımlarımızdır.
- Üretim kaynaklarına dokunulmaz. Mevcut kullanıcı değişiklikleri korunur. Yeni dosyalar görev dalında oluşturulur.

## Süreç

1. **Tur 1 — bağımsız açılış:** Her agent diğerlerini okumadan kendi alternatiflerini, tercihini, gerekçesini ve itirazlarını yazar. Üç görüş de alınmadan çoğunluk belirlenmez.
2. **Tur 2 — çapraz tartışma:** Her agent diğer iki dosyayı okur; onların somut önerilerine cevap verir. Kabul ettiği ve değiştirdiği görüşleri açıklar. Nihai oy henüz verilmez.
3. **Tur 3 — ortak pusula:** Tartışmadan sonra numaralı ve aynı ifadeli kararlar tüm agent'lara sunulur. Her agent her madde için tek oy, kısa gerekçe ve varsa çekincesini kaydeder.
4. **Sayım:** Üç eşit oy; en az iki oy alan seçenek kabul. Moderatör dördüncü oy vermez. Bir koşul iki oy almayan yeni bir karar yaratıyorsa ek oylama yapılır. Repo veri doğruluğu ve sözleşme kuralları oylamayla kaldırılamaz.
5. **Prototip:** Kazanan seçenekler somut ekran/kontrol/label ile eşlenir. Karşı oylar kayıttan silinmez.
6. **İnceleme:** Aynı üç agent prototipi kendi alanından değerlendirir. Kontroller ve gerekli düzeltmeler kaydedilir.

## Kullanıcıya sunulacak kayıtlar

- `round1-*.md`: üç bağımsız açılışın tam metni.
- `round2-brief.md` ve `round2-*.md`: moderatörün ortak soruları ve üç çapraz cevap.
- `ballot.md` ve `votes-*.json` / `round3-*.md`: aynı pusula, ayrı oylar ve gerekçeleri.
- `decisions.md`: hesaplanmış sonuçlar, karşı oylar ve prototip eşlemesi.
- `transcript.md` ve HTML'deki kurul görünümü: görüşmelerin tur sırasıyla tamamı.
- `verification.md`: doğrulama kanıtı ve sınırlar.

Bu protokolde dosya adları süreç için belirlenmiştir; dosyaların varlığı veya kontrollerin geçtiği ancak son doğrulama kaydında iddia edilir.


---

## Moderatör · görsel kanıt ve erişim kaydı

Kaynak: `sources.md`

# Görsel kanıt ve erişim kaydı

İnceleme tarihi: 2026-10-17. Uygulama kullanımı veya hesap oturumu açılması yapılmadı. Yayımlanmış gerçek uygulama ekranları görsel olarak incelendi. Platformların nedenlerine ilişkin açıklamalar agent'ların tasarım yorumudur.

## Ortak açılış kanıtları

- **TIKR:** [Detailed Financials resmî ekranı](https://d39we3xer0vs8v.cloudfront.net/DetailedFinancials-Hero.png), [ürün sayfası](https://www.tikr.com/). Yerel `tikr-financials.png`. Beyaz analiz yüzeyi, açık sol gezinme, koyu üst şerit ve sıcak seçili kontrol örneği. Görselin içindeki şirket/fiyatlar prototip verisi yapılmadı.
- **Koyfin:** [Financial Analysis resmî ekranı](https://www.koyfin.com/wp-content/uploads/2022/12/financial-analysis-header-1.png), [özellik sayfası](https://www.koyfin.com/features/financial-analysis/), [dashboard ekranı](https://www.koyfin.com/help/content/images/2024/06/myd-header.png). Yerel `koyfin-financials.png` ve `koyfin-dashboard.png`. Koyu kabuk, açık yoğun finansal tablo ve panel oranları. Tarihsel örnek, bugün bütün uygulamanın böyle olduğu iddiası yok.
- **TradingView — ikincil referans:** [Resmî watchlist yardım sayfası](https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/). Yerel `tradingview-table.png` ve `tradingview-workspace.png`. Liste ayırıcıları, hizalama ve ana/yan alan oranı için ikincil kanıt.

## Tur 2'ye eklenen kanıt

- **Stock Rover:** [Dashboard hero kesiti](https://www.stockrover.com/img/hero/hero-dashboard-15x.jpg), [dashboard yardım ekranı](https://www.stockrover.com/img/help/help/dashboard/Dashboard_overview.png), [yardım sayfası](https://www.stockrover.com/help/dashboard/whats-in-the-dashboard/). Yerel `stockrover-dashboard.jpg` ve `stockrover-overview.png`. Moderatör görselleri açıp inceledi, üç agent'a gönderdi. Üçü de kendi Tur 2 metnine bu ek kanıtın etkisini yazdı. İnce piyasa şeridi, portföy grafiği ve kesintisiz tablo; küçük yazı ve yüksek yoğunluk doğrudan kopyalanmadı.
- **Fiscal.ai / FinChat:** Ana sayfa bu oturumda erişilemedi; önceki denemede 403 görüldü, yeni denemede de içerik alınamadı. API dokümanı erişilebilir fakat iç uygulamanın görsel kanıtı değildir. Bu nedenle Fiscal.ai dashboard renkleri, yerleşimi veya kontrol davranışı incelenmiş gibi oylanmadı.

Yeni Stock Rover erişimi önceki “henüz görsel olarak incelemedim” durumunu bu oturum için günceller. Canlı dashboard gezilmiş olduğu anlamına gelmez.

## Prototipteki gerçek veri kesiti

[Microsoft 2025 Annual Report — Income Statements](https://www.microsoft.com/investor/reports/ar25/index.html). 30 Haziran'da biten FY2023/FY2024/FY2025 dönemleri; EPS hariç milyon USD:

| Gösterge | FY2023 | FY2024 | FY2025 |
|---|---:|---:|---:|
| Toplam gelir | 211915 | 245122 | 281724 |
| Satışların maliyeti | 65863 | 74114 | 87831 |
| Brüt kâr | 146052 | 171008 | 193893 |
| Ar-Ge gideri | 27195 | 29510 | 32488 |
| Faaliyet kârı | 88523 | 109433 | 128528 |
| Vergi öncesi kâr | 89311 | 107787 | 123627 |
| Net kâr | 72361 | 88136 | 101832 |
| Seyreltilmiş EPS, USD | 9.68 | 11.80 | 13.64 |

Grafikte yalnız gelir/net kâr aynı kaynaktan milyar USD'ye ölçeklenir. Bu veri tarihsel rapor kesitidir; güncel fiyat, portföy, risk veya AI kararı değildir. Hesap/piyasa alanları bilinmiyor olarak kalır. Otomatik doğrulamada canlı finansal sağlayıcı çağrılmaz.

## Yerel ürün dayanakları

`AGENTS.md`, `SPEC.md`, `docs/spec/current-system/architecture.md`, `contracts.md`, `docs/agent/verification.md`, `docs/product/PRD.md`; mevcut `DashboardHome`, `ChartWorkspace`, `LeftNav`, `TopBar` ve `index.css`. Mevcut kullanıcı değişikliklerine dokunulmadı. Eski HTML önerileri onaylı tasarım olarak kabul edilmedi.


---

## Tur 1 · A Görsel tasarım · bağımsız açılış

Kaynak: `round1-visual.md`

# Tur 1 — A: Görsel tasarım ve ürün kimliği

Benim önerim, **grafit gezinme kabuğu içinde beyaz araştırma yüzeyi ve kobalt etkileşim rengi**. Kimliği büyük başlıklar veya sürekli renkli kartlar yerine okunabilir finansal tablolar, belirgin şirket bağlamı ve tutarlı eylemler taşımalı. Amaç; ABD hisse ve ETF araştıran bireysel yatırımcının fiyatı, şirket kanıtını, portföy etkisini ve kendi notunu aynı çalışma alanında değerlendirmesi. Bu metin bağımsız ilk görüşümdür; kurulun ortak kararı veya onaylı tasarım değildir.

## Gördüğüm kanıt ve sınırı

Yereldeki `tikr-financials.png` ile `koyfin-financials.png` dosyalarını görüntü aracıyla açtım. TIKR ekranında koyu üst şerit, açık sol menü, beyaz finansal tablo; turuncuyla seçilmiş dönem, sekme ve sembol görüyorum. Şirket adı solda, fiyat sağda. Tablo başlığının koyuluğu ve toplamların kalınlığı, satır hiyerarşisini kuruyor. Koyfin ekranında koyu dış gezinme, açık şirket başlığı ve geniş finansal tablo var. Yıllar yatayda karşılaştırılıyor; gerçekleşen ve tahmin kolonları yüzey tonuyla ayrılıyor. Gördüğüm Koyfin örneği tarihsel ekran; bugünkü uygulamanın bütünü hakkında çıkarım yapmıyorum.

İkincil olarak `tradingview-table.png` dosyasını açtım: beyaz liste yüzeyi, sade yatay çizgiler, sembol etiketleri ve rakam kolonları baskın. Bu üç ekranın ortak güçlü yanı veri hizalaması. Aynı font ailesini kullandıklarını söyleyemem; ekran görüntüsü font kimliğini kanıtlamaz. Fiscal.ai/FinChat için önceki erişimin 403 verdiği bilgisi var; arayüzünü görmüş gibi değerlendirmiyorum. Stock Rover ekranı bu incelemede yok. Referans kapsamımız bu nedenle henüz dengeli değil.

Kaynak bağlamları: [TIKR resmî ekranı](https://d39we3xer0vs8v.cloudfront.net/DetailedFinancials-Hero.png), [Koyfin finansal analiz ekranı](https://www.koyfin.com/wp-content/uploads/2022/12/financial-analysis-header-1.png), [TradingView resmî izleme listesi açıklaması](https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/). Bunları tasarım yönü için kullanıyorum; görsellerdeki piyasa değerlerini ürün verisi olarak önermiyorum.

## İki alternatif ve tercihim

**A — Açık araştırma masası:** Grafit üst ve sol kabuk, beyaz tablo/grafik alanı, kobalt seçili durumlar. Artısı uzun metin, rapor ve yıllık kolon karşılaştırmasının aynı aydınlık yüzeyde yapılması. Kobalt, yükseliş ve düşüş renginden bağımsız eylem dili kurar. Eksisi koyu kabuk ile açık veri arasındaki parlaklık farkı; özellikle karanlık odada rahatsız edebilir.

**B — Nötr koyu analiz alanı:** Kömür `#161A20`, yükseltilmiş yüzey `#20262E`, metin `#EDF1F5`, seçim `#F0B85A`. Grafik ve izleme listesi için güçlü bir devamlılık sağlar. Ancak çok sayıda tablo, kaynak açıklaması ve analist metni aynı koyu yoğunluğa girerse sayfa katmanlarını ayırmak zorlaşır. Mevcut frontend zaten koyu mavi ağırlıklı; kullanıcıya görünür bir yön değişimini yalnız başka bir koyu paletle anlatmak yeterli olmayabilir.

**Tercihim A.** TIKR’den sıcak vurgu rengini almak zorunda değiliz. Beyaz araştırma alanı, düzgün satır ritmi ve şirket merkezli başlık derslerini alıp kendi etkileşim sistemimizi kurabiliriz. Önceki V3’ün amber seçimini otomatik olarak devralmıyorum: amberi veri eskiliği ve uyarıda kullanmak daha tutarlı bir anlam dağılımı sunuyor.

## Somut görsel sistem

| Rol | Öneri |
|---|---|
| Üst/sol kabuk | `#191E25`; kabuk metni `#E8EDF3` |
| Sayfa ve veri | Canvas `#F3F5F7`, ana yüzey `#FFFFFF`, kolon başlığı `#EEF1F5` |
| Metin | Ana `#18212C`, yardımcı `#566477` |
| Çizgiler | Bölüm çizgisi `#DCE2E9`; kontrol sınırı `#A8B3C2` |
| Etkileşim | Kobalt `#2458D3`; hover `#1C46AC`; pressed `#17398C` |
| Seçili alan | `#EAF0FF`, metin `#204CB4`, 2px seçim çizgisi |
| Finansal yön | Artış `#137454`, azalış `#B53A43`; sayı işareti daima görünür |
| Kanıt durumu | Eski/kısmi `#875500` / `#FFF3D6`; yok `#566477` / `#EEF1F5` |

Font için ilk tercih `Inter`, yedek `Segoe UI`, ardından sistem sans. Prototipte haricî font yüklenmesi zorunlu olmamalı. Şirket başlığı 26/32px ve 650 ağırlık; sayfa başlığı 24/32px; bölüm 16/24px; tablo/metin 13/20px; yardımcı kaynak bilgisi en az 12/18px. Sayılar tabular rakam kullanmalı, sağa hizalanmalı; her rakamı monospace yapmak gerekmiyor.

Aralıklar 4/8/12/16/24/32px; paneller 6px, butonlar 4px radius. Veri panelleri gölgesiz ve 1px çizgili. Menü/modal gibi üst katmanlarda `0 12px 32px #17212B26` gölge kullanılabilir. Masaüstü buton 36px, dokunmatik hedef 44px. Birincil buton kobalt üzerinde beyaz; ikincil buton beyaz, koyu metin ve görünür sınır. Disabled durum `#E7EBF0` üzerinde `#657184`; işlemin neden kapalı olduğu metinle belirtilmeli. Klavye odağı 3px `#2458D3`, 2px açık boşlukla görünmeli. Bunlar önerilen tokenlar; birleşimlerin kontrastı prototipte ölçülmeli.

## Yerleşime etkisi

1440px masaüstünde sol menü 184px, üst araç şeridi 56px, içerik kenarı 24px. Beş ana görev ve mevcut route’lar korunmalı. Üst şeritte sembol arama baskın; kimlik alanı dar ve sade. Ürün adı henüz kesinleşmediyse yeni isim veya iddialı marka söylemi tasarımın ön koşulu olmamalı.

Bugün ekranında başlık ve veri zamanı altında kompakt portföy özeti; devamında yaklaşık 2:1 performans ve izleme düzeni öneriyorum. Pozisyonlar geniş tablo, haber ve takvim daha aşağıda iki bölge. Aynı sayıda büyük KPI kartı üretmek yerine toplam değer, güncel fiyat kapsamı ve performans bağlamı bir bantta ilişkilendirilmeli. Fiyat eksikse toplam `—`, fiyatlanan ara toplam ve kapsam görünür kalmalı.

Araştır ekranında şirket kimliği, fiyat/zaman ve “İzlemeye ekle” eylemi aynı başlıkta. Altında Finansallar, Teknik, Risk, Haber, Makro ve AI inceleme alanları mevcut işlevlerin yerleşimini düzenler. Finansallar seçiliyken tablo ana alandır; büyük fiyat grafiğini her sekmenin üstünde tutmam. Grafik teknik incelemede büyür. 280px bağlam sütunu kaynak ve portföy bağlamını taşır; dar ekranda ilgili içeriğin altına iner. Altı analist tek büyük sonuç rozetiyle örtülmemeli; sabit sıra ve analist durumları okunabilir bir listede görünmeli. Backend ara aşama bildirmiyorsa prototip gerçek zamanlı ilerleme varmış gibi davranmamalı.

## Kurula sorularım ve itirazlarım

1. Amberi hem seçim hem veri eskiliği için kullanırsak yatırımcı “aktif kontrol” ile “dikkat gerektiren kanıt” ayrımını nasıl yapacak? Kobalt seçim üzerinde uzlaşabilir miyiz?
2. Araştırmada her sekmenin üzerinde büyük grafik tutmanın finansal tabloya maliyetini kabul ediyor muyuz? Grafik boyutunu seçili araştırma görevine göre değiştirmeyi öneriyorum.
3. Sağ bağlam sütunu sürekli açık olduğunda 1280px ekranda tablo kaç anlamlı dönem gösterecek? Başlangıçta kapatılabilir olması gerekli mi?
4. Dashboard’da önceliği toplam varlığa mı, izlenen tez değişimine mi veriyoruz? Bu seçim kart sayısından önce çözülmeli.

## Kendi seçiminin zayıflığı

Kobalt ve grafit güvenilir ama yaygın bir kurumsal yazılım dili; tek başına ayırt edici kimlik yaratmaz. Kimliğin özgünlüğü şirket odaklı başlıkta, kaynak bilgisinin düzeninde ve araştırmadan günlüğe geçişte kurulmalı. Açık yüzey de tüm kullanıcılara uygun olmayabilir. İlk prototipte gündüz kullanımı ve okunurluğu önceliyorum; tam ikinci tema tasarlamak bu ilk turun odağını dağıtır. En güçlü itirazım kendime şu: Palet değişip tablo yoğunluğu, metin boyu ve görev sırası değişmezse kullanıcının memnuniyetsizliği sürer. Bu nedenle önerim renk kararı kadar alan ve hiyerarşi kararıdır.


---

## Tur 1 · B İş akışı · bağımsız açılış

Kaynak: `round1-workflow.md`

# Tur 1 — B: Yatırımcı iş akışı, sayfa mimarisi ve finansal veri

Bu, diğer uzmanların görüşlerini okumadan hazırladığım bağımsız tasarım konuşmasıdır; son oylama değildir. Tercihim, beş ana görevi koruyan, Bugün ekranında inceleme sırasını belirginleştiren ve Araştır ekranında seçilen kanıta geniş alan veren bir çalışma alanı. Mevcut kodla yeni yerleşim önerilerini ayırıyorum. Üretim koduna dokunmadım.

## Görsel kanıt ve projeyle eşleşme

`tikr-financials.png`, `koyfin-dashboard.png` ve `koyfin-financials.png` dosyalarını gerçekten açıp inceledim. Bunlar tarihsel ürün ekranı referanslarıdır; canlı hesaba girip güncel arayüzü kullandığım anlamına gelmez. Fiscal.ai için 403 sınırı var; Stock Rover ekranı yok. Bu ikisinin tablo, buton veya yoğunluğunu görmüş gibi değerlendirmiyorum.

TIKR ekranında şirket kimliği solda, fiyat ve zaman sağda; araştırma sekmeleri bunların altında. Dönem, para birimi ve gösterim birimi tablo başlamadan okunabiliyor. Aynı şirket bölümlerinin hem solda hem yatay menüde tekrarlanması ise bize taşınmamalı. Koyfin finansal ekranı daha az üst boşlukla daha fazla satır gösteriyor. Grup başlığı, alt metrik girintisi ve sağa hizalama, kart sayısı artırmadan hiyerarşi kuruyor. Koyfin dashboard’unda soldaki uzun liste ile sağdaki iki grafik eşzamanlı karşılaştırmayı destekliyor; fakat her panelin ayrı araçları, kişisel araştırma akışımızda gereksiz kontrol rekabeti yaratabilir.

Mevcut `DashboardHome` araştırmaya davet eden büyük bir alanın ardından ikinci portföy başlığı ve tekrar metrikler gösteriyor. İlk ekranın görevi iki kez anlatılıyor. `ChartWorkspace` ise grafiğe ve 256 piksel sembol listesine odaklanıyor; bu, temel araştırmanın tamamı sayılamaz. Finansal, risk, haber ve rapor erişimini aynı sembol bağlamında buluşturmalıyız. V3’ün sans yazı ve düzenli tablo yönü yararlı; üç araştırma sekmesi ve sürekli kaynak/not sütunu mevcut araştırma kapsamını fazla küçültüyor. Microsoft rapor örneği de ETF araştırmasının yerleşimini doğrulamıyor.

## İki mimari seçeneği

**A: Panel terminali.** Bugün; portföy metrikleri, büyük performans grafiği, dağılım, pozisyonlar ve haberlerden oluşur. Araştır; aynı anda grafik, metrik tablosu ve sağ bağlam paneli gösterir. Koyfin dashboard’uyla akraba olan bu seçenek, sürekli açık geniş monitörde hızlı tarama sağlar. Bedeli, ilk ziyarette nereden başlanacağının belirsizliği ve finansal tablonun daralmasıdır.

**B: Göreve göre odaklanan araştırma alanı.** Bugün, portföy durumundan takvim ve ilgili habere ilerler. Araştır, şirket başlığını sabit tutar; seçilen sekme ana yüzeyi devralır. Finansallarda tablo tam genişler, grafikte yardımcı sembol listesi açılabilir. B’yi tercih ediyorum. Kullanıcı uzun vadeli ABD hisse/ETF araştırması yapıyor; her veri sınıfına aynı anda küçük kutular vermek yerine incelenen kanıtı okunur büyüklükte tutmak daha uygun.

Bu tercih, otomatik öncelik puanı veya yeni günlük AI özeti gerektirmiyor. Bugün içeriğinin sırası tasarım kararıdır. Screener, Decision Card, Portfolio Fit, transkript ve genel AI sohbeti bu teslimde çalışan özellik gibi görünmemeli; tartışılacaklarsa açıkça **GELECEK** etiketi taşımalı.

## Beş sayfanın somut yerleşimi

Masaüstünde 192 piksel görev menüsü ve 56 piksel üst şerit öneriyorum. Şeritte “Şirket veya sembol ara” araması baskın; mevcut portföy seçimi daha küçük bir kontrol. Şirket fiyatı küresel şeritte sürekli tekrar etmez. İçerik alanında yaklaşık 24 piksel kenar boşluğu yeterli. Mobilde aynı görevler alt gezinmeye iner; tablo kendi içinde kayar.

**Bugün:** Başlık yalnız “Bugün”. İlk satırda portföy seçimi, “Güncel değer”, “Maliyet” ve “Fiyat kapsamı”; ikinci satırda alanın üçte ikisinde performans, üçte birinde dağılım. Ardından “Pozisyonlar” tablosu ve “Haberler / Takvim” sekmeleri. Makro göstergeler kısa bağlam şeridi olur; boşsa yüksek bir panel kaplamaz. Portföy yokken bu alanın yerine tek “Portföy oluştur” eylemi gelir; “Varlık araştır” ikincil erişimi kalır.

**Araştır:** Başlıkta sembol, doğrulanmış ad/tür, para birimi ve son fiyat zamanı; sağda “İzlemeye ekle” ve mevcut raporlara erişim. Önerilen sekmeler “Genel bakış”, “Grafik”, “Finansallar”, “Risk”, “Haberler”, “AI raporu”. Bu, mevcut araçların yeni görsel gruplamasıdır; bugün tek workspace içinde uygulanmış sayılmaz. Genel bakışta grafik/metrik oranı yaklaşık 65/35; finansallarda tablo yüzde 100 genişlik alır. Kaynak ayrıntıları satırın yanından açılır, sürekli 258 piksel tüketmez. ETF’de şirket gelir tablosu yerine yalnız gerçekten desteklenen fon verisi veya açık kapsam açıklaması gösterilir.

Grafik araç sırası dönem, görünüm, göstergeler şeklinde olmalı. Mevcut 1D–1Y dönemleri, Mum/Çizgi/Alan/Heikin Ashi ve SMA20/SMA50 korunabilir. Ancak “1D” son bir barı gösteriyorsa gün içi fiyat izlenimi yaratmamalı; aralık ve gözlem sıklığı açıklanmalı. OHLC yoksa mum seçilememeli. Heikin Ashi dönüştürülmüş görünüm olarak etiketlenmeli. AI raporu kanıt sekmelerinden sonra gelir; mevcut rapor yoluna erişim korunur. Altı analistin sırası Temel, Teknik, Risk, Boğa, Ayı, Portföy Yöneticisi olarak görünür; API aşama ilerlemesi vermiyorsa sahte canlı ilerleme çizilmez.

**İzleme Listem:** Liste seçici ve “Sembol ekle” üstte; alanın tamamında sıralanabilir araştırma tablosu. Sembol, son fiyat, değişim, veri zamanı ve mevcut araştırma alanları gruplanır. İlk sütun sabit kalır. Sağda sürekli boş detay paneli yerine sembole basınca araştırma açılır.

**Portföy:** “Özet / Pozisyonlar / İşlemler” sekmeleri öneriyorum; mevcut işlem ekranının derin bağlantısı korunur. Özette performans/dağılım oranı 70/30, pozisyonlarda tam genişlik tablo. “İşlem ekle” kayıt eylemidir; alım emri düğmesi gibi sunulmaz. **Günlük:** Üstte “Kayıt ekle”, sembol ve tarih filtreleri; altta mevcut günlük kayıtları. Serbest araştırma notu mevcut kayıt şemasıyla doğrulanmadan çalışan kalıcı özellik diye tanıtılmaz; V3’ün oturum notu ürün günlüğünün yerine geçmez.

## Etiketler, durumlar ve mali doğruluk

Butonlar “İncele”, “Ayrıntı” gibi belirsiz ifadeler yerine “Kaynağı aç”, “Raporu aç”, “Yeniden dene” demeli. Yüklenirken yerleşim korunur ve “Fiyat geçmişi yükleniyor” yazılır. Boş listede “Henüz sembol eklenmedi”; sonuçsuz aramada “Eşleşme bulunamadı”; sağlayıcı hatasında “Fiyat kaynağına ulaşılamadı” farklı durumlardır. Kısmi araştırma, çalışan sekmeleri korur. Yetersiz geçmiş, hangi metriğin hesaplanamadığını söyler. Eski fiyatın zamanı görünür; genel yeşil “Güncel” rozeti kullanılmaz.

Eksik fiyat varsa toplam güncel değer bilinmiyor kalır. “Fiyatı bulunan pozisyonların ara toplamı” ve adet kapsamı ayrıca sunulur. Maliyet güncel değere dönüştürülmez; eksik getiri sıfır olmaz. Grafik aralığı değişince eksik noktalar hayalî çizgiyle doldurulmaz. Para birimi ve mali yıl, sayının yanında veya açık tablo başlığında yer alır.

## Diğer uzmanlara itirazlar ve tercihin kaybı

Görsel kimlik uzmanına sorum: Amber hem ana eylem hem eksik veri uyarısı olursa kullanıcı seçim ile veri sorununu nasıl ayıracak? Ben açık nötr yüzey, koyu metin ve kontrollü mavi seçimden yanayım; olumlu/olumsuz renkler yalnız finansal anlam taşımalı. Yoğunluğu navigasyonda rahat, tablolarda 36–40 piksel satır ritmi olarak öneriyorum.

Etkileşim uzmanına itirazım: Kaynak panelini sürekli açık tutmak, finansal sütunları kaydırmaya zorluyorsa kaynak görünürlüğü uğruna karşılaştırmayı bozuyoruz. Satırdan açılan panel yeterince bulunabilir nasıl olur? İkinci sorum, altı araştırma sekmesini dar ekranda hangi açık etiketlerle erişilebilir tutacağımızdır. İki uzmana ortak sorum: Büyük fiyat ve getiri başlıkları, fiyatı olmayan araştırma ekranında bütün hiyerarşiyi çökertiyor mu?

B seçeneğinin kaybını kabul ediyorum: Grafikle bilanço aynı anda sürekli görünmez; kullanıcı sekme değiştirir. Tam terminal arayan kişi daha az özelleştirme bulur. Buna karşılık araştırmanın esas yüzeyi genişler ve her bölümün veri durumu daha açık kalır. Son oylamada bu bedeli özellikle tartışmak istiyorum.


---

## Tur 1 · C Etkileşim · bağımsız açılış

Kaynak: `round1-interaction.md`

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


---

## Tur 2 · moderatörün ortak soruları

Kaynak: `round2-brief.md`

# Tur 2 — moderatörün çapraz tartışma çağrısı

Üç bağımsız açılış alındı. Henüz palet veya yerleşim kararı oylanmadı. Aşağıdaki özet önerileri yönlendirmek için değil, somut uyuşmazlıkları görünür yapmak için yazıldı. Katılımcılar asıl metinleri okumalıdır.

## Açılıştaki uyuşmazlıklar

1. **Renk:** Üç agent da mavi/kobalt etkileşime yakın; önceki V3'ün amber seçimi otomatik kabul edilmiyor. Mavi kurumsal/sıradan görünme riski taşıyor. Bu riski nasıl çözeceğiz? Tam koyu analitik yüzey neden ilk tercih olmasın?
2. **Kabuk:** A grafit üst ve sol kabuk önerdi. B/C açık veri yüzeyini savunuyor; TIKR'nin açık sidebar'ı da kanıtta mevcut. Sidebar'ın açık/koyu olmasının veri alanı ve seçili kontrol üzerindeki maliyetini tartışın.
3. **Yoğunluk:** A tablo 13px ve sıkı ritim; B 36–40px satır; C varsayılan40/kompakt32 önerdi. Görünen satır sayısı ile okuma/dokunma hedefleri nerede dengelenecek?
4. **Kaynak paneli:** A 280px bağlam sütununu, B finansallarda tam genişlik ve gerektiğinde açılan kaynağı savunuyor. C bulunabilirlik ve klavye odağını tartışıyor. Kalıcı kısa kaynak satırı + isteğe bağlı panel bir uzlaşma olabilir mi? Tablo/sayfa genişliği eşiklerini somutlaştırın.
5. **Dashboard:** Üç açılışta portföy değeri/performance ağırlığı var; A tez değişimi önceliğini sordu. Henüz desteklenmeyen otomatik öncelik/tez sinyali üretmeden “Bugün” ekranı kullanıcıya hangi tek sonraki adımı verecek?
6. **Araştırma:** B altı sekme öneriyor; A görevle değişen grafik/tablo yüzeyini destekliyor; C dar ekran ve klavye davranışını soruyor. Sekme adlarını, başlangıç sekmesini ve AI raporunun yerini kesinleştirin.
7. **Buton ve label:** C tek baskın kayıt eylemi, navigasyonda bağlantı, AI için ikincil erişim istiyor. A/B'ye: aynı panelde birincil buton sayısı, metinleri, ikonların rolü ve açıklayıcı label'lar için neyi kabul/red ediyorsunuz?
8. **Günlük:** B serbest oturum notunun mevcut kalıcı günlüğün yerine geçmediğini belirtti. Prototipte kullanıcının kendi yazısını göstermek ve çalışma ürünü izlenimi vermemek için etiket/akış nasıl olmalı?

## Cevap biçimi

Diğer iki `round1` dosyasını okuyun. Kendi `round2-[rol].md` dosyanıza 450–700 kelimelik, kullanıcıya sunulacak doğrudan tasarım cevabı yazın. En az bir paragrafta A/B/C'den her ilgili katılımcının somut bir önerisini adıyla cevaplayın. Koruduğunuz, değiştirdiğiniz ve reddettiğiniz noktaları açıkça ayırın. En az iki gerçek ödünleşimi kaydedin. Sahte uzlaşma üretmeyin; nihai oy bir sonraki turda.

Yeni görsel kanıt gelirse ayrıca paylaşılacak. Fiscal.ai hâlâ erişilememişken arayüzü hakkında hüküm kurulmayacak.


---

## Tur 2 · A Görsel tasarım · çapraz yanıt

Kaynak: `round2-visual.md`

# Tur 2 — A: Diğer görüşlere açık yanıtım

B’nin iş akışı ve C’nin etkileşim açılışlarını tam okudum. Beyaz veri yüzeyi ve mavi etkileşim tercihim sürüyor. Kalıcı sağ panel önerimi değiştiriyorum; tablo yoğunluğunda C’nin varsayılan 40px / kompakt 32px seçeneğini kabul ediyorum. Bu değişiklikler ortak karar iddiası değildir; oylama henüz yapılmadı.

## 1. Renk ve özgünlük

B ile C’nin amberi veri uyarısına ayırma gerekçesini destekliyorum. Kobalt `#2458D3`, beyaz veri yüzeyi `#FFFFFF`, grafit kabuk `#191E25` önerimi koruyorum. Tam koyu analiz alanını ilk seçenek olarak reddediyorum: ürünümüzün uzun finansal metin ve dönem karşılaştırması ihtiyacı, mevcut koyu frontend’den görünür bir değişim beklentisiyle birleşiyor. Bu, koyu temanın nesnel olarak kötü olduğu iddiası değildir. Kobaltın sıradanlığını farklı bir vurgu rengi ekleyerek çözmem; kısa şirket başlığı, tutarlı tablo ritmi ve kaynak dilinin düzeni kimliği oluşturmalı. Fazladan marka rengi, finansal semantiğe rekabet getirir.

## 2. Açık veya koyu sidebar

TIKR’nin açık sidebar’ını gördüm; çalışmadığını iddia etmiyorum. Yine de dar grafit sidebar tercihimi koruyorum. Beş ana görevin araştırma sekmelerinden mekânsal olarak ayrılması yararlı. Sidebar yalnız 184–192px olmalı; sembole özel ikinci menü içermemeli. Seçili görev açık mavi yerine grafit üzerinde belirgin açık metin, nötr yükseltilmiş yüzey ve kobalt kenar çizgisiyle gösterilebilir. Bedeli, açık içerikle parlaklık farkı ve daha baskın bir sol kenar. Açık sidebar bu farkı azaltır; fakat görev gezinmesinin tablo kontrollerine karışması riskini artırır. Burada uzlaşmış değiliz.

## 3. Yoğunluk

C’nin **varsayılan 40px, kompakt 32px** önerisini kabul ediyorum; B’nin 36–40px aralığından daha kesin ve kullanıcıya açıklanabilir. Tablo metni 13px, yardımcı metin 12px kalır. Kompakt mod masaüstünde daha çok dönem/satır inceleyen kullanıcı içindir. Mobilde 32px satıra küçük eylem düğmeleri sıkıştırılmamalı; etkileşim hedefleri 44px korunmalı. Ödünleşim açık: ilk açılışta daha az satır görünür. Bunu yazıyı küçülterek telafi etmeyi reddediyorum; fazla üst boşluğu ve tekrarlanan kartları kaldırmalıyız.

## 4. Kaynak paneli

B’nin **finansallarda tam genişlik ve gerektiğinde açılan kaynak** yaklaşımı lehine kendi kalıcı 280px sütun önerimi değiştiriyorum. Kalıcı kısa satırda kaynak, dönem, birim ve veri durumu görünmeli; “Kaynak ayrıntıları” açıkça adlandırılmış kontrol olmalı. 1440px ve üzerindeki viewport’ta, ana alan en az 900px kalıyorsa 280px panel yan tarafta açılabilir. Bu iki koşuldan biri sağlanmıyorsa odak yönetilen çekmece öneriyorum. Panel başlangıçta kapalıdır. C’nin bulunabilirlik kaygısına yanıtım: kaynak erişimini yalnız küçük bilgi ikonuna veya hover’a saklamayalım. Bedeli bir ek açma hareketi; kazancı karşılaştırma kolonlarının alanı.

## 5. Bugün ve sonraki adım

Otomatik tez değişimi önceliğini bu prototipin başına koyma fikrimi geri çekiyorum; mevcut kanıt bunu desteklemiyor. B’nin portföy özeti → performans/dağılım → pozisyonlar → haber/takvim sırası daha somut. Tek sonraki adım, portföy boşsa “Portföy oluştur”, doluysa kullanıcının seçtiği pozisyonda bağlantı olarak “Araştırmayı aç” olabilir. Sırf sayfa dolsun diye önerilen hisse veya öncelik puanı üretmemeliyiz.

## 6. Araştırma sekmeleri

B’nin altı sekmesini kabul ediyorum: **Genel bakış, Grafik, Finansallar, Risk, Haberler, AI raporu**. Teknik göstergeler Grafik içinde, makro şirket bağlamıyla Genel bakış içinde sunulabilir. Başlangıç Genel bakış olsun; prototip buradan açılsın. AI raporu son sekmedir; mevcut rapor derin bağlantıları korunur. Grafik her sekmenin üstünde zorunlu kalmaz. C’nin dar ekran itirazını kabul ediyorum: etiketler tek satırlık kaydırılan şeritte tam okunmalı, taşan devam görünür olmalı; sekme odağı kendisini görünür alana taşımalı.

## 7. Butonlar ve label’lar

C’nin **aktif bölgede tek baskın kayıt eylemi** yaklaşımını kabul ediyorum. Görüntüleme ekranında primary bulunması şart değil. “İzleme listesine ekle” secondary; “AI raporunu aç” bağlantı/secondary; Günlük formunda “Kaydı kaydet” primary olur. Gezinmede bağlantı kullanılır. İkonlar metne yardımcıdır; yalnız ikon kullanan kontroller erişilebilir ad ve görünür açıklama almalı. Arama label’ını mevcut kapsam nedeniyle “Kayıtlı varlıklarda ara” yapmayı destekliyorum.

## 8. Günlük ve prototip sınırı

B’nin serbest notun kalıcı günlüğün yerine geçmediği itirazı doğru. Prototipte kullanıcı yazabilsin; alan üzerinde “Prototip notu — bu oturumda tutulur” açıklaması, kaydettikten sonra da “Prototipte saklandı” durumu olmalı. Gerçek sunucu kaydı izlenimi verilmemeli. İsim ve akışta sahte işlem günlüğü yaratmak yerine mevcut kayıt alanlarının temsili formunu ve açık prototip sınırını savunuyorum.

**Ek görsel kanıt:** [Stock Rover resmî dashboard görselini](https://www.stockrover.com/img/hero/hero-dashboard-15x.jpg) yerel dosyadan gerçekten açtım. İnce piyasa şeridi, portföy özetiyle ilişkili geniş performans grafiği ve kesintisiz tablo görüyorum. Önceki sentezimi değiştirmiyor; daha az kart ve geniş tablo önerisini güçlendiriyor. Görseldeki küçük metinleri kendi ölçeğimize taşımam. Sidebar bu kesitte görünmediği için açık/koyu sidebar kararına kanıt saymıyorum. Rakamlar referansa aittir; Fiscal.ai için gözlemim hâlâ yok.


---

## Tur 2 · B İş akışı · çapraz yanıt

Kaynak: `round2-workflow.md`

# Tur 2 — B: Yerleşim, araştırma akışı ve kayıt sınırı

A’nın ve C’nin ilk tur metinlerini bütünüyle okudum. İlk tercihimdeki göreve göre genişleyen araştırma yüzeyini koruyorum. Bugün için önerimi kesinleştiriyorum: portföy durumu önce gelir; desteklenmeyen bir araştırma kuyruğu veya tez değişimi puanı tasarlamıyoruz. Bu metin nihai oy değildir.

**Renk ve kabuk.** A’nın kobalt etkileşim, grafit üst şerit ve açık finansal yüzey önerisini kabul ediyorum. C’nin amberi kısmi/eski veri durumuna ayırmasını da destekliyorum. Kobaltın sıradan görünmesini ikinci bir dekoratif renkle çözmeyelim; şirket başlığının düzeni, kaynak satırı ve metrik gruplaması kimliği taşısın. Tam koyu analiz alanını ilk seçenek olarak reddediyorum: rapor metni ve uzun tabloyu incelemek temel görevimiz. Bunun bedeli karanlık ortamda parlak yüzeydir; bunu saklamıyorum.

A’nın grafit **sol** kabuğuna katılmıyorum. İlk turdaki açık sidebar tercihimi koruyorum: yalnız beş görevin olduğu menü için yüksek kontrastlı geniş bir blok gerekmiyor. Açık menü, şirket araştırmasına ayrılan ana yüzeyle daha sakin birleşir; seçili görev açık mavi dolgu, koyu metin ve çizgiyle belirlenir. Koyu sidebar’ın gezinme sınırını daha hızlı ayırdığı avantajını kabul ediyorum; benim seçeneğimde bu sınır daha siliktir.

**Yoğunluk ve kaynak.** C’nin varsayılan 40px, isteğe bağlı kompakt 32px satırını kabul ederek ilk turdaki 36–40px aralığımı değiştiriyorum. Tablo yazısı 13px, yardımcı metin en az 12px olsun. Aynı yükseklikte daha az satır görülecek; kompakt seçenek bu kaybı kullanıcıya seçtirir. Satır eylemleri mobilde 44px hedefi korumalı; kompakt satıra küçük silme ikonları sıkıştırılmamalı.

A’nın sürekli 280px bağlam sütununu finansallarda reddediyorum. Uzlaşma önerim: başlık altında daima görünen kısa “Kaynak · dönem · birim · veri zamanı” satırı, yanında “Kaynak ayrıntıları” kontrolü. Kullanılabilir ana içerik genişliği 1180px ve üzerindeyse, kullanıcı isterse 280px panel açabilir; tabloya en az 880px kalmalı. Bunun altında panel tabloyu daraltmadan çekmece olarak açılır. C’nin bulunabilirlik itirazını, açık metinli kontrol ve satıra bağlı kaynak bağlantısıyla yanıtlıyorum. Çekmece kapanınca odak açan kontrole döner. Karşılaştırma genişliği kazanılıyor, ancak kaynak ayrıntısı ek tıklama istiyor.

**Bugün ve Araştır.** Bugün’ün tek önerilen sonraki adımı, portföy varsa “Portföyü incele” bağlantısıdır. Portföy yoksa “Portföy oluştur” eylemi öne çıkar. Araştırma her zaman üst aramayla erişilir; ilk ekranı büyük araştırma tanıtım kartı kaplamaz. Portföyün fiyat kapsamı, performansı, pozisyonları ve ilgili haber/takvim mevcut kanıttan gösterilir. Otomatik tez alarmı yoktur.

Araştırmada altı etiketi kesinleştiriyorum: **Genel bakış / Grafik / Finansallar / Risk / Haberler / AI raporu**. İlk giriş “Genel bakış”tır; doğrudan bölüm bağlantısı kendi bölümünü açabilir. Temel oranlar ve mevcut makro bağlam genel bakışta; teknik göstergeler Grafik içinde bulunur. A’nın görevle değişen ana yüzeyini destekliyorum. “AI raporu” son sekmedir; altı analistin mevcut sırası korunur. Dar ekranda sekmeler yatay kayar ve devamı görünür kalır; belirsiz ikonlara dönüşmez. C’nin sekme ile sayfa bağlantısını ayıran klavye önerisini kabul ediyorum.

**Buton ve label.** C’nin aktif çalışma bölgesinde tek baskın kayıt eylemi ve gezinmede gerçek bağlantı önerisini kabul ediyorum. Formda “Kaydı kaydet”, listede “Liste oluştur”; aynı panelde ikisini birden dolu mavi göstermeyelim. “Portföyü incele” ve “Araştırmayı aç” bağlantıdır. “İzleme listesine ekle” ikincil butondur. İkonlar metni destekler; kaynak, silme ve grafik görünümü yalnız ikonla açıklanmaz. AI erişimi görünür ama baskın çağrı olmaz. Gerçek arama kapsamı mevcut varlıklarla sınırlıysa placeholder “Varlıklarımda sembol ara” demeli.

**Günlük.** V3’ün oturum notunu kalıcı günlük görünümü olarak sunmayı reddediyorum. Prototipin Günlük sayfası mevcut kayıt akışını temsil eden ayrı bir tasarım yüzeyi olmalı. Kullanıcı yazısını deneyebilsin diye düzenleyici kullanılacaksa üstünde **“Prototip taslağı — yalnız bu açık oturumda tutulur”**, eylemde **“Taslağı önizle”** yazmalı. Önizlemenin yanında “Kaydedilmedi; yenilemede silinir” açıklaması kalmalı. Sahte başarı bildirimi veya “Kalıcı günlüğe kaydedildi” ifadesi kullanılmamalı. Gerçek kalıcı kaydetme, üretimde mevcut günlük sözleşmesiyle yapılır; serbest araştırma notu şeması doğrulanmadan yeni yetenek sayılmaz.

**Ek görsel kanıt — Stock Rover.** Sonradan paylaşılan `stockrover-dashboard.jpg` dosyasını görüntü aracıyla açtım; [resmî ekran kaynağı](https://www.stockrover.com/img/hero/hero-dashboard-15x.jpg). Dar piyasa şeridi, tek portföy performans alanı ve altındaki kesintisiz tablo açıkça ilişkili; büyük karşılama kartı veya sürekli sağ kaynak sütunu yok. Bu, portföy öncelikli Bugün ve geniş tablo tercihimi güçlendiriyor. Ancak referanstaki çok küçük satırları veya beş günlük dönemi varsayılan almıyorum: bizim 40px ritmimiz daha az satır gösterir ve uzun vadeli kullanıcı dönemini seçebilmelidir. Görseldeki rakamlar yalnız referansa aittir; Fiscal.ai için hâlâ görsel hüküm kuramıyorum.


---

## Tur 2 · C Etkileşim · çapraz yanıt

Kaynak: `round2-interaction.md`

# Tur 2 — C: Etkileşim önerisine çapraz cevap

A’nın `round1-visual.md` ve B’nin `round1-workflow.md` metinlerinin tamamını okudum. Aşağıdaki değişiklikler bağımsız ilk görüşümü geliştiriyor; nihai oy vermiyorum.

## 1. Renk ve kimlik

A’nın kobaltı ve B’nin kontrollü mavi seçimini destekliyorum. Kendi `#175CD3` önerime bağlı kalmak yerine A’nın `#2458D3` değerini gerçek kontrast ölçümü koşuluyla kullanabiliriz. Kimliğin sıradanlaşması riskini yeni renklerle çoğaltarak çözmem: tutarlı sayı hizası, şirket bağlamı ve kısa kaynak satırı kimliği taşır. Tam koyu yüzeyi ilk seçenek yapmıyorum; rapor ve finansal tablo ağırlığında açık yüzey tercihim sürüyor. Amber seçim önerisini reddediyorum; veri uyarısına ayrılmalı.

## 2. Grafit kabuk

A’nın grafit üst ve sol kabuğuna itiraz etmiyorum; ilk önerimdeki açık yüzey veri bölgesine aitti. Açık sidebar da mümkün, fakat seçili görevin açık veri alanına karışması ihtimalini artırıyor. Grafit sidebar’da seçili görev yalnız renkle ayrılmamalı: açık yazı, belirgin zemin ve işaret gerekir. Bedeli gündüz de görülen parlaklık sınırı ve karanlık odada yüksek fark. Bu tercihi koyu analitik yüzeyi zorunlu kılmadan kabul edebilirim.

## 3. Yoğunluk ve hedefler

A’nın 36px masaüstü butonu ile 44px dokunmatik hedefini kabul ediyorum. B’nin 36–40px tablo ritmine karşı varsayılan 40px/kompakt 32px tercihimi koruyorum. 400px tablo alanında yaklaşık 10 yerine 12 satır gösterebilen 32px seçenek deneyimli kullanıcıya yarar; 40px daha fazla kaydırır. Bu gerçek maliyeti kabul ediyorum. 13px tablo, 12px yardımcı bilgi alt sınırım; 9–10px grafik etiketlerini reddediyorum. Satır yüksekliği ile eylem hedefi aynı şey değildir: kompakt satırın içinde 44px mobil buton sıkıştırmayız; mobilde satır eylemlerini genişleyen alana taşırız.

## 4. Kaynak paneli ve odak

B’nin finansallarda tam genişlik ve açılan kaynak önerisine yaklaşıyorum; A’nın sürekli 280px panelini varsayılan yapmıyorum. Kaynak/dönem kısa satırı sürekli görünür, “Kaynak ayrıntıları” düğmesi paneli açar. Ana içerik 1100px altında panel kapalı başlar; daha geniş alanda kullanıcı açabilir. 1440px ekranda 184px menü ve kenarlarla kalan yaklaşık 1208px’den 280px almak tabloyu yaklaşık 900px’e düşürür; kaç dönem sığacağı gerçek kolonlarla doğrulanmalı.

Masaüstü panel modal değilse odak tuzağı kurmaz: düğme `aria-expanded` taşır, ardından panel başlığına odak verilir; kapatma odağı düğmeye döndürür. Mobilde içeriği örten drawer modaldır: arka plan etkisizleşir, Tab içeride kalır, Escape kapatır. Panel içinde tablo satırı değiştiğinde odak kendiliğinden sıçramaz. Kaynak görünürlüğünün bedeli bir ek açma hareketidir.

## 5. Bugün ekranı

A’nın tez değişimi sorusunu B’nin mevcut kanıta dayanan düzeni çözüyor. Otomatik tez sinyali üretmeden portföy kapsamı ve pozisyonların ardından gerçek haber/takvim sunulur. Varsayılan sonraki adım “Pozisyonları incele” bağlantısı olabilir; her kullanıcıya yapay aciliyet yüklemez. Portföy yokken B’nin “Portföy oluştur” ana eylemi doğru. Eksik toplamda büyük boş fiyatın yerine açıklama ve kapsam hiyerarşiyi taşır.

## 6. Araştırma sekmeleri

B’nin “Genel bakış / Grafik / Finansallar / Risk / Haberler / AI raporu” altılısını destekliyorum; başlangıç Genel bakış. A’nın ayrı Makro sekmesi yerine makroyu Bugün bağlamında tutarım. AI raporu en sonda ve ikincil erişimde kalır. Dar ekranda tam adlarla yatay kaydırılan tek sekme şeridi, görünür devam işareti ve ok tuşuyla seçime otomatik kaydırma gerekir. Altı sekmenin bedeli görünmeyen seçeneklerdir; ikonlara indirgemek bu bedeli çözmez.

## 7. Buton ve label

A’nın beyaz ikincil butonunu kabul ediyorum. B’nin “Kaynağı aç”, “Raporu aç”, “Yeniden dene” metinleri benim katalogla uyumlu. Her aktif form bölgesinde bir dolu kayıt eylemi; gezinmede bağlantı kullanırım. “İşlem ekle” emir değildir, kayıt akışını açar. İkonlar yazıya eşlik eder; grafik ikonları erişilebilir ad taşır. Finansal artı/eksi, veri durumu ve seçili kontrol farklı anlamlarını korur.

## 8. Günlük ve kalıcılık

B’nin itirazını kabul ediyorum: oturum notu mevcut kalıcı günlük yerine geçemez. Prototipte mevcut günlük formunun yalnız arayüzünü göstermek, desteklenmeyen serbest not ürünü oluşturmaktan daha doğru. Kullanıcının yazdığı alan kalacaksa açık “Prototip taslağı — sunucuya kaydedilmez” etiketi ve “Taslağı bu oturumda göster” eylemi gerekir; “Kaydedildi” demeyiz. Kalıcı kayıt izlenimi yaratmanın karşılığında kazanılacak akıcılığı reddediyorum. Sayfa yenileme veya kapatmada kayıp açıkça anlatılmalı; backend desteği varmış gibi davranılmamalı.

## Ek görsel kanıt — Stock Rover

`stockrover-dashboard.jpg` görselini açtım; [resmî kaynak](https://www.stockrover.com/img/hero/hero-dashboard-15x.jpg). Kompakt piyasa şeridi, portföy performansı ve kesintisiz tablo ilişkisi açık. Bu, kalıcı kaynak sütunu yerine göreve ayrılmış geniş yüzeyi destekliyor. Çok küçük label’ları ve satırları kopyalamıyorum; 40/32px tercihim değişmedi. Yoğunluğu yazıyı küçülterek kazanmak istemiyorum. Görseldeki rakamlar referans ürünün ekran verileri; Mercek verisi sayılmaz. Fiscal.ai hakkında görsel hüküm kurmuyorum.


---

## Tur 3 · herkese sunulan aynı oy pusulası

Kaynak: `ballot.md`

# Tur 3 — aynı ifadeli nihai oy pusulası

Tur 1 ve Tur 2 tamamlandıktan sonra moderatör tarafından yayımlandı. Her madde A veya B seçeneğine tek oy alır. Katılımcı kodları **A Görsel / B İş akışı / C Etkileşim** ile seçenek harfleri karıştırılmamalıdır. Üç agent eşit oy sahibidir; moderatör oy kullanmaz. İki veya üç oy alan seçenek kazanır. Gerekçe ve karşı görüş kaybolmaz.

Yeni Stock Rover görselleri Tur 2 sonrasında alınan ek kanıttır; her katılımcı en az birini gerçekten açıp görüşüne eklemeli. Fiscal.ai için bu oturumda görsel erişim yok; UI tasarım oyu bu platform görülmüş gibi gerekçelendirilemez.

| ID | Karar konusu | Seçenek A | Seçenek B |
|---|---|---|---|
| D01 | Ana analiz teması | Beyaz veri yüzeyi + nötr açık canvas | Nötr koyu veri yüzeyi + koyu canvas |
| D02 | Etkileşim vurgusu | Kobalt `#2458D3`; amber yalnız veri uyarısında | Amber ana seçim/eylem; uyarı ikon + metinle ayrılır |
| D03 | Gezinme kabuğu | Grafit `#191E25` üst ve sol menü | Grafit üst bar + açık gri sol menü |
| D04 | Tablo ritmi | Varsayılan40px, kullanıcı seçerse kompakt32px | Varsayılan36px, kullanıcı seçerse rahat44px |
| D05 | Kaynak ayrıntıları | Kısa kaynak/dönem/birim satırı kalıcı; panel başlangıçta kapalı. ≥1440px ve tablo≥900px kalıyorsa isteğe bağlı280px yan panel; diğer durumda modal drawer | Kısa kaynak satırı kalıcı; ayrıntı her genişlikte modal pencere |
| D06 | Bugün hiyerarşisi | Portföy durumu → performans/dağılım → pozisyonlar → haber/takvim; makro kısa şerit | Araştırmaya giriş → izleme listesi → portföy özeti; araştırma merkezli ilk görünüm |
| D07 | Araştırma bölümleri | Genel bakış / Grafik / Finansallar / Risk / Haberler / AI raporu | Genel bakış / Finansallar / Grafik / Risk / Haberler / AI raporu |
| D08 | Araştırmada ilk sekme | Genel bakış; seçilen görev ana yüzeyi devralır | Finansallar; rapor tablosu ilk yüzey |
| D09 | Buton hiyerarşisi | Aktif formda en çok1primary; gezinme link; ekleme secondary; silme nesnesi açık kırmızı | Görüntüleme ekranında1primary gezinme + formda1primary; diğerleri secondary |
| D10 | Arama etiketi | “Kayıtlı varlıklarda ara”; Ctrl/⌘K, oklar, Enter, Escape, sonuç sayısı | “Şirket veya sembol ara”; sonuçlarda kapsam açıklaması, aynı klavye davranışı |
| D11 | Finansal özet label'ları | “Güncel değer”, “Maliyet”, “Fiyat kapsamı”; toplam bilinmiyorsa açıklama + bilinen ara toplam | “Portföy değeri”, “Toplam maliyet”, “Fiyatlanan pozisyonlar”; aynı doğruluk ve ara toplam kuralları |
| D12 | Yazı ölçeği | Gövde14px, tablo13px, yardımcı bilgi12px; şirket26px/panel16px | Gövde13px, tablo13px, yardımcı bilgi11px; şirket24px/panel14px |
| D13 | Ölçü ve yüzey | 192pxsidebar,56pxüstbar,24pxkenar,16pxpanelarası,6pxpanel/4pxkontrol radius; gölge yalnız üstkatmanda | 184pxsidebar,56pxüstbar,20pxkenar,18pxpanelarası,4pxpanel/kontrol radius; gölge yalnız üstkatmanda |
| D14 | Prototip günlüğü eylemi | “Taslağı önizle”; “Prototip taslağı — yalnız bu açık oturumda tutulur”; başarı değil önizleme | “Taslağı bu oturumda göster”; “Sunucuya kaydedilmez; yenilemede silinir”; başarı değil önizleme |
| D15 | Mobil ana görevler | Beş görev alt menüde tam anlaşılır etiketlerle görünür | Dört görev + “Diğer” menüsünde Günlük; beş görev erişilebilir |
| D16 | AI sunumu | Son sekmede altı analist sabit sırada görünür; her rolde gerçek veri yoksa açık durum, sahte ilerleme/rapor yok | Son sekmede tek açık unavailable durumu; analist sırası ayrı “Nasıl çalışır” açıklamasında |
| D17 | Eylem label uzunluğu | “İzleme listesine ekle”, “Kaynak ayrıntıları”, “İşlem kaydı ekle”; anlam nesneyle açık | “İzle”, “Kaynak”, “İşlem ekle”; nesne yakın başlıktan anlaşılır |
| D18 | HTML açılış ekranı | Araştır / Genel bakış; kaynağı belirtilmiş rapor kesitiyle görsel tasarımı değerlendirme | Bugün; bağlı olmayan hesabın gerçek boş durumuyla ilk oturumu değerlendirme |

## Oy dosyaları

Her agent `votes-[rol].json` dosyasına aşağıdaki yapıda **18 benzersiz karar için tam oy** yazar. İkinci dosya `round3-[rol].md` içinde 250–450 kelime genel açıklama, varsa karşı oyunun korunmasını istediği nokta ve prototipte bakacağı maddeler bulunur. Bir seçenek için şartlı oy verirsen şart gerekçede olsun; seçenek metnini değiştirme. Yeni bir davranışı şart koşacaksan ayrıca açık değişiklik talebi yaz; otomatik kabul sayılmaz.

```json
{"agent":"visual","votes":[{"id":"D01","choice":"A","reason":"Kısa ve somut gerekçe","reservation":"Varsa çekince; yoksa boş metin"}]}
```

Özel talimat: Stock Rover ek kanıtını hâlâ incelemediysen önce görüntüyü aç ve Tur 2 dosyana “Ek görsel kanıt” paragrafı ekle. Herkes diğer iki Tur 2 metnini okuyarak oy verir. Çoğunluğu tahmin ederek veya uzlaşma üretmek için oy verme.


---

## Tur 3 · A Görsel tasarım · oy açıklaması

Kaynak: `round3-visual.md`

# Tur 3 — A: Nihai oy açıklamam

Diğer iki Tur 2 metnini ve ortak pusulanın tamamını okudum. Stock Rover’ın resmî dashboard kesitini görüntü aracıyla açtım; ek gözlemimi Tur 2 metnime ekledim. Fiscal.ai için görüntü görmediğimden bu platformu oylarıma dayanak yapmıyorum. Oy dosyamda 18 kararın her birinde A seçeneğini seçtim. Bu, sonuç veya uzlaşma ilanı değildir; pusuladaki ifadeler kendi tercihlerimle örtüşüyor. Moderatörün sayımını bekliyorum.

Temel tercihim beyaz araştırma yüzeyi, grafit görev kabuğu ve kobalt etkileşim. D03’te B’nin açık sidebar görüşüne katılmıyorum. Beş görevli dar koyu menünün, şirket bağlamındaki araştırma kontrollerinden daha açık ayrıldığını düşünüyorum. Açık sidebar’ın parlaklık geçişini yumuşatması güçlü bir karşı gerekçe; sonuç hangi yönde olursa bu kayıp kayıtta kalmalı. Kobaltın kurumsal sıradanlığını da kabul ediyorum. Görsel kimliğin asıl sınavı tablo ritmi, kaynak düzeni ve alan ağırlıkları olacak.

D05’te her genişlikte modal yerine uyarlanan kaynak panelini seçtim. Tablo en az 900px kaldığında açık panelle veri ve kaynak birlikte okunabilir. Dar alanda aynı yaklaşım modal çekmeceye dönüşür. Bunun uygulama maliyeti iki ayrı odak davranışıdır; sırf görsel sadelik için bütün ekranları modal içine taşımayı tercih etmiyorum. Başlangıçta panel kapalı kalır; kaynak satırı ve açık metinli düğme görünürdür.

C’nin 40/32px yoğunluğunu ve tek baskın kayıt eylemini benimsedim. B’nin göreve göre genişleyen finansal tablo yaklaşımı ilk önerimdeki kalıcı sütunu değiştirdi. Bunlar diğer görüşlerden aldığım somut düzeltmeler. Günlük konusunda da kendi Tur 2 metnimdeki “Prototipte saklandı” ifadesinden vazgeçiyorum: **“Taslağı önizle”** ve oturum sınırı daha doğru. Kaydedildi çağrışımı prototipin akıcılığından daha ağır basıyor.

Prototip incelemesinde şirket başlığının büyük boşluk üretip üretmediğine, 13px rakamların kolon düzenine, 12px kaynak metinlerinin kontrastına ve 40px satırın görsel ağırlığına bakacağım. 1440px kaynak paneli eşiği gerçek tabloyla doğrulanmalı. Mobilde beş görevin uzun etiketlerini, yatay sekmelerin devam işaretini ve uzun butonların taşmasını kontrol edeceğim. Araştırmayla açılma oyum, kaynaklı rapor kesitinde tasarımın gerçekten değerlendirilebilmesi için; statik örnek asla canlı hesap veya fiyat gibi sunulmamalı.


---

## Tur 3 · B İş akışı · oy açıklaması

Kaynak: `round3-workflow.md`

# Tur 3 — B: Nihai oy gerekçem

A’nın ve C’nin ikinci tur yanıtlarını okudum; ortak pusuladaki 18 maddeye ayrı ayrı tek oy verdim. Oylamamı çoğunluğu tahmin ederek değiştirmedim. Özellikle D03’te açık gri sol menü seçeneğini koruyorum. Beş ana görevi taşıyan menünün grafit blokla baskınlaşmasına gerek görmüyorum. A ve C’nin görev sınırını belirginleştirme gerekçesini anlıyorum; benim tercihim daha sakin bir açık menü. Çoğunluk koyu menüyü seçerse bu itirazım kayıtlı kalmalı.

Diğer temel kararlarım açık veri yüzeyi, kobalt etkileşim, 40px varsayılan ve 32px isteğe bağlı tablo ritmi. TIKR ve Koyfin’de gördüğüm güçlü ortak özellik renk kopyası değil; şirket bağlamıyla tablo kolonlarının düzeni. Sonradan gerçekten açtığım Stock Rover ekranı da kısa piyasa şeridi, portföy performansı ve kesintisiz tablo ilişkisinin çalışabilir bir görsel örneğini sağladı. Referans rakamlarını veya çok küçük satırlarını ürünümüze taşımıyorum.

D05’te ilk turdaki sürekli kaynak sütunu itirazım karşılandı: kısa kaynak satırı kalıyor, panel kapalı başlıyor. Pusuladaki 1440px viewport ve tabloya en az 900px bırakma koşullarını kabul ediyorum. Bu koşulları birbirinin alternatifi saymamalıyız. Tablo daralacaksa ayrıntı çekmecede açılır. Kazanç karşılaştırma genişliği; bedel kaynak ayrıntısına ek açma hareketidir.

Bugün için portföy önceliğine, Araştır için Genel bakış başlangıcına oy verdim. Altı sekmede Grafik ikinci, AI raporu son sırada. HTML’in Araştır/Genel bakışla açılmasını ise yalnız tasarım değerlendirmesi için seçtim: kaynaklı rapor kesiti, boş bir hesaptan daha fazla yerleşim kanıtı sunar. Bu, gerçek uygulamanın varsayılan rotasını değiştirme oyu değildir. Kaynaklı tarihsel kesit güncel fiyat gibi gösterilemez.

Prototip incelemesinde şu noktaları kontrol edeceğim: Finansallar seçilince tablo gerçekten genişliyor mu; ETF için şirket bilançosu zorlanıyor mu; eksik fiyat toplamı bilinmiyor bırakıyor mu; maliyet ayrı mı? Birim ve mali yıl okunur olmalı. AI’nin altı rolü sonuç varmış gibi görünmemeli. Günlükte “Taslağı önizle” eylemi gerçek kayıt başarısı izlenimi vermemeli; kullanıcı kendi yazısını görürken yenilemede silineceğini anlamalı. Bağlantı, kayıt ve silme eylemlerinin görsel hiyerarşisi de finansal anlam kadar açık olmalı.


---

## Tur 3 · C Etkileşim · oy açıklaması

Kaynak: `round3-interaction.md`

# Tur 3 — C: Bağımsız oy açıklaması

A’nın ve B’nin ikinci tur cevaplarını bütünüyle okudum; Stock Rover ek ekranını da görüntüledim. On sekiz karara kendi tercihimle oy verdim. Oyların çoğunun A seçeneğinde olması bir çoğunluk tahmini değildir; pusulada A seçeneği önceki iki turda savunduğum açık yüzey, kobalt etkileşim, okunur metin ve görevle değişen araştırma alanını büyük ölçüde karşılıyor.

Grafit kabuk tercihim A’nın görev ayrımı gerekçesine dayanıyor. B’nin açık sidebar seçeneğinin daha sakin olduğunu kabul ediyorum; karşı görüşünün kayıttan silinmesini istemem. Açık veri yüzeyinin karanlık ortam maliyeti de gerçek. İleride tema düşünülebilir, fakat ilk prototipin iki farklı görsel sistemi birden çözmesi gerekmiyor.

Kaynak ayrıntılarında D05’in A seçeneğine oy verdim. Burada hem viewport en az 1440px olmalı hem panel açıldıktan sonra tabloya en az 900px kalmalı. Şartlardan biri eksikse modal drawer uygulanır. Geniş ekranda isteğe bağlı nonmodal panel Tab odağını hapsetmez; modal drawer arka planı etkisizleştirir ve odağı içeride tutar. Her ikisi kapandığında odak açan düğmeye döner. Bu koşulları farklı bir yerleşime dönüştüren örtülü ek talebim yok.

Günlük için D14’te B’ye oy verdim. “Sunucuya kaydedilmez; yenilemede silinir” açıklaması kaybın ne zaman ve neden olduğunu somut söylüyor. B’nin “Taslağı önizle” metni daha kısa olsa da açık kalıcılık sınırını tercih ediyorum. Hangi seçenek kazanırsa kazansın gerçek kayıt başarı bildirimi üretmemek sözleşme gereği; bu oylamayla değişmez.

Prototip incelemesinde özellikle 320px genişlikte beş görev etiketini, sekme devamını ve sayfanın yatay taşmasını kontrol edeceğim. Grafik ikonlarının erişilebilir adları, seçili SMA’nın `aria-pressed` bilgisi, aramanın ok/Enter/Escape kullanımı ve sonuç duyurusu somut ölçütlerim. Görünür odak hover’dan ayrılmalı; 13px tablo ve 12px yardımcı metin korunmalı. 40px satırın daha az içerik göstermesini kabul ediyorum; 32px seçeneği görünür, fakat mobil dokunma hedeflerini küçültmeyen bir düzen olmalı.

Araştırma Genel bakış açılışı yalnız kaynak ve tarih açıkken tasarımı değerlendirmeye yardım eder. Referans ekran fiyatları, uydurma piyasa hareketi veya hazır AI kararı kullanılamaz. Eksik portföy değerinde açıklama ve fiyat kapsamının doğru kalmasını, renk kadar belirleyici bir kabul ölçütü sayıyorum.


---

## Moderatör · sonuçlar ve sayfa eşlemesi

Kaynak: `decisions.md`

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


---

## A Görsel tasarım · kabul edilen görsel sistem

Kaynak: `visual-spec.md`

# Görsel uygulama tarifi — kabul edilen kararların karşılığı

Bu belge `vote-results.json` içindeki kazanan seçenekleri HTML’e dönüştürür. D02’nin kobaltı, D03’ün grafit kabuğu, D12’nin yazı ölçeği ve D13’ün ölçüleri bağlayıcıdır. Aşağıdaki yardımcı tonlar ve font yedekleri ayrıca oylanmış yeni kararlar değil; kazanan yönün uygulama ayrıntılarıdır. Üretim tasarım sistemi değişikliği veya kullanıcı onayı sayılmaz.

## Palet ve anlam katmanları

| Rol | Renk | Kullanım |
|---|---|---|
| Kabuk | `#191E25` | Üst şerit ve sol görev menüsü |
| Kabuk metni | `#E8EDF3` | Navigasyon; yardımcı metin `#B7C1CE` |
| Seçili kabuk yüzeyi | `#2B3441` | Açık yazı ve kobalt kenar çizgisiyle birlikte |
| Canvas / veri | `#F3F5F7` / `#FFFFFF` | Çalışma zemini ve ana veri yüzeyi |
| Tablo başlığı / zebra | `#EEF1F5` / `#F8FAFC` | Kolon ve satır ritmi |
| Ana / yardımcı metin | `#18212C` / `#566477` | Başlık, değer ve kaynak açıklaması |
| İnce çizgi / kontrol sınırı | `#DCE2E9` / `#A8B3C2` | Bölüm ayrımı ve etkileşimli kontrol |
| Etkileşim | `#2458D3` | Birincil eylem, bağlantı, seçim işareti |
| Seçim yüzeyi / metni | `#EAF0FF` / `#204CB4` | Aktif sekme ve dönem kontrolü |
| Finansal artış / azalış | `#137454` / `#B53A43` | İşaretli sayısal değişim; yatırım hükmü değil |
| Uyarı metni / yüzeyi | `#875500` / `#FFF3D6` | Kısmi, eski veya yetersiz kanıt |
| Yokluk metni / yüzeyi | `#566477` / `#EEF1F5` | Veri yok, bağlantı yok, hesaplanamayan değer |

Amber seçim veya dekoratif marka rengi olmaz. Yeşil “her şey güncel” rozeti kullanılmaz. Sayısal yön artı/eksiyle, durum ise açık metinle anlaşılır. Silme eyleminde kırmızı metin/sınır D09’un kabul edilmiş anlamıdır; bu, negatif fiyatla aynı işlev gibi sunulmaz. Grafik serilerinde kobalt ve nötr gri kullanılabilir; kaynaksız çizgi çizilmez. Bütün metin/yüzey çiftleri gerçek render üzerinde kontrast ölçümü gerektirir.

## Tipografi ve alan

Gövde **14px**, tablo **13px**, yardımcı bilgi **12px**, şirket başlığı **26px**, panel başlığı **16px**. Satır yükseklikleri uygulama ayrıntısı olarak sırasıyla 21/20/18/32/24px önerilir. Font ailesi `Inter`, ardından `Segoe UI`, sistem sans; internetten font indirmek prototipin ön koşulu değildir. Normal metin 400, kontroller 600, şirket/toplamlar 650–700 ağırlık kullanabilir. Sayılar tabular rakam ve sağ hizalı; etiketler sol hizalıdır. Birim, dönem ve para birimi tooltip içine gizlenmez.

Sidebar **192px**, üst şerit **56px**, içerik kenarı **24px**, panel arası **16px**. Panel radius **6px**, kontrol radius **4px**. Alt aralık ritmi 4/8/12/16/24/32px olabilir. Tablolar varsayılan **40px**, kullanıcının seçtiği kompakt modda **32px** satırdır. Mobil eylem hedefi **44px** kalır. Veri yüzeyleri gölgesiz, 1px çizgilidir; menü ve modal gibi üst katmanda `0 12px 32px #17212B26` uygulanabilir.

## Buton durumları

Birincil: kobalt/beyaz; hover `#1C46AC`, pressed `#17398C`. İkincil: beyaz/koyu metin ve kontrol sınırı; hover `#F3F5F7`, pressed `#E7ECF2`. Seçili kontrol açık mavi yüzey, koyu mavi metin ve çizgi/işaret taşır. Disabled: `#E7EBF0` üzerinde `#657184`, görünür gerekçe; bütün kontrolü saydamlaştırmayın. Focus: 3px kobalt halka, 2px açık boşluk. Loading: değişmeyen genişlik ve açık durum metni. Hover ve focus aynı durum değildir. Aktif formda en çok bir primary; gezinmede bağlantı kullanılır. “İzleme listesine ekle”, “Kaynak ayrıntıları”, “İşlem kaydı ekle” tam adları korunur.

## Referans aktarımı ve risk

TIKR’den şirket başlığının netliği ve dönem/birim görünürlüğü; Koyfin’den geniş tablo, metrik gruplaması ve koyu kabuk/açık veri ayrımı; TradingView’den sade liste çizgileri; Stock Rover’dan portföy grafiği ile tablo ilişkisi alındı. Tekrarlanan araştırma menüleri, turuncu seçim, küçük yazı, tahmin kolonları ve yoğun mini kontroller aktarılmadı. Fiscal.ai görülmediği için dayanak değildir.

Başlıca riskler koyu/açık parlaklık farkı, tanıdık kobalt dilinin sıradanlığı ve 40px ritmin gösterdiği satır sayısıdır. D05’in açılan paneli 900px tablo sınırıyla, mobil uzun etiketler gerçek ekranla doğrulanmalı. Bunları çözmek için yeni davranışı oy sonucu gibi sunmayın; gerekli sapmayı kurul kaydında açıkça belirtin.


---

## C Etkileşim · buton, label ve durum sözleşmesi

Kaynak: `component-contract.md`

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


---

## Son inceleme · A Görsel tasarım

Kaynak: `review-visual.md`

# A — Prototip görsel incelemesi

İncelenen teslim `docs/prototypes/mercek-design-council.html`; uygulama ayrıntısı için `.cache/design-council-v4/council.css` ve `council.js` okundu. `mercek-council-desktop.png`, `financials.png`, `source-wide.png`, `mobile.png`, `source-mobile.png` ve `ai.png` dosyalarını görüntü aracıyla gerçekten açtım; son beş kısa adın ortak öneki `mercek-council-`dir. Bu inceleme görsel ve kaynak denetimidir; klavye akışını canlı tarayıcıda çalıştırdığımı veya kontrast ölçümü yaptığımı iddia etmiyorum. Ekranlar ana agent tarafından üretilmiştir.

## Sonuç: iki düzeltme koşuluyla görsel kabul

Ana yön oylanan tasarımla tutarlı: D01 açık veri, D02 tam `#2458D3` etkileşim, D03 grafit üst/sol kabuk, D04 finansal satır ritmi ve D13 ana ölçüleri kaynakta mevcut. Başlangıç görünümü D18’e göre Araştır / Genel bakış. Şirket kimliği, fiyat yokluğu, tarihsel rapor ve kaynak ayrımı okunuyor; sahte güncel fiyatla hiyerarşi doldurulmamış. Aşağıdaki iki bulgu düzeltildikten veya taze karşı kanıtla kapatıldıktan sonra görsel alanımdaki kabul koşulu kalkar.

### V01 — Orta önem: 12px yardımcı bilgi kararından kalan sapmalar

**Karar:** D12.

CSS ana gövdeyi 14px, tabloyu 13px ve birçok kaynak açıklamasını 12px yapıyor. Ancak `.council-link span` 11px; `.rail-user` ve `.rail-user small` 10px; `.eyebrow` 11px; mobil `.company-head .eyebrow` 10px. Mobil `.market-item small`, `.portfolio-metric .metric-note`, `.board-stat span` 11px kalmış. Masaüstü ekranında sidebar altındaki prototip/kurul bilgisinin küçük kalması da görülüyor. Bunlar salt süs yerine bağlam ve yardımcı bilgi taşıyor; D12’deki 12px alt ölçeğine taşınmalı. Arama, mobil gezinme ve önizleme şeridi son override ile zaten 12px olmuş; bunları yanlışlıkla açık bulgu saymıyorum. Print kurallarını bu ekran incelemesine dahil etmiyorum.

**Kapatma koşulu:** Etkilenen ekranda kullanılan yardımcı metinlerin computed font boyutu ve taze masaüstü/mobil görüntüleri 12px ölçeğini doğrulasın. Büyük başlık veya tüm panelleri yeniden tasarlamak gerekmiyor.

### V02 — Orta önem: mobilde aktif araştırma bağlamı görünür değil

**Kararlar:** D07, D08; AI bağlamında D16.

`mercek-council-mobile.png` AI raporu içeriğini gösteriyor; yatay sekme şeridinde AI raporu etiketi görünmüyor. Sağ kenardaki kısa mavi çizgi seçili sekmenin devamının kesildiğini düşündürüyor. Devam oku başka sekme bulunduğunu anlatıyor, seçili bölümün adını göstermiyor. Kaynakta `setTab` içinde `scrollIntoView` bulunması olumlu; ancak bu ekran resize veya yeniden render sonrasında seçili bağlamın görünür kaldığını kanıtlamıyor.

**Kapatma koşulu:** AI raporuna geçiş, yeniden render ve masaüstünden mobil genişliğe geçişten sonra seçili sekme etiketi görünür olsun; taze görüntüyle doğrulansın. Bu, yeni gezinme kararı değildir; kabul edilen sekmelerin görünür seçili durumunu korur. Sorun yalnız eski görüntüye aitse yeni kanıt yeterlidir.

## Tutarlı görülen alanlar

- D05: Geniş kaynak paneli tabloyu yaklaşık 900px alanda bırakıyor; kaynakta `≥1440px` ve `≥900px` koşulları, 280px panel mevcut. Mobil kaynak görüntüsü tablonun yanında dar sütun yerine çekmece gösteriyor. Odak davranışı bu incelemenin sınırı dışında.
- D04/D12: Finansalların grup vurgusu, sağa hizalı rakamları, üç dönem karşılaştırması ve gölgesiz yüzeyi görsel olarak açık. Kompakt modun gerçek hesaplanan satır ölçüsü ana test kaydında doğrulanmalı.
- D09/D17: Araştırma başlığında secondary ekleme ve bağlantı var; gereksiz primary bulunmuyor. Kaynak erişimi yalnız ikona saklanmamış.
- D16: Altı analist sırası mevcut; açık “Çıktı bağlı değil” durumları gerçek yürütme veya hazır analiz izlenimi vermiyor.
- D15: Mobilde beş ana görev anlaşılır metinleriyle görünür. Tam sayfa ekran yakalamasında sabit alt menünün araya görünmesini tek başına içerik kapanması hatası saymıyorum.

## Karşı görüşlerin korunması

Ben D03’te kazanan grafit sidebar yönündeydim. B’nin açık sidebar karşı oyunu görsel uygulama silmemeli; kabulüm bu görüşün kurul kaydında bulunmasına bağlı mevcut protokolü değiştirmez. D14’te C’nin daha açık oturum metni tercihi de saklanmalı. Kobaltın tanıdık görünmesi ve koyu/açık parlaklık farkı tasarımın kabul edilmiş ödünleşimleridir; bunları düzeltme bahanesiyle yeni palet veya yeni karar dayatmıyorum.

## Düzeltme sonrası — V01 ve V02 kapatıldı

Güncel `mercek-council-desktop.png`, `mercek-council-mobile.png` ve `mercek-council-mobile-ai.png` görüntülerini yeniden açtım. CSS sonundaki hedefli override; V01’de saydığım eyebrow, kurul alt bilgisi, kullanıcı alanı ve mobil piyasa/portföy/kurul yardımcı metinlerini 12px yapıyor. Masaüstünde sidebar alt bilgilerinin büyüdüğünü, mobilde kaynak ve bağlam metinlerinin okunur kaldığını görüyorum. **V01 kapalı.**

Mobil Genel bakış görüntüsünde seçili etiket solda görünür. Güncel mobil AI görüntüsünde listeye ekleme sonrasındaki yeniden render durumunda **AI raporu** etiketi ve alt çizgisi tamamen görünür; önceki sağ kenarda kesilme yok. `render()` sonundaki ve `resize` sonrasındaki `revealSelectedTab()` çağrılarını kaynakta doğruladım. **V02 kapalı.**

Ana agentın `.cache/design-council-v4/verification-results.json` kaydını okudum: `2026-10-17T16:26:07.826Z`, 22 grup, çıkış kodu 0; 40/32px tablo, 320–1920px responsive görünümler ve yeniden render sonrası seçili sekme görünürlüğü dahil kayıtların durumu `pass`. Bu testleri kendim tekrar çalıştırmadım; sonuçlar ana agentın doğrulama kanıtıdır.

**Görsel alanımdaki iki kabul koşulu sağlandı; oylanan yönün bu HTML prototipini görsel açıdan kabul ediyorum.** Önceki bulgular geçmişi göstermek için korunmuştur. Bu kabul kullanıcı onayı, üretime geçiş kararı veya bütün ürünün erişilebilirlik sertifikası değildir. Karşı oyların korunması ve daha önce yazılan tasarım ödünleşimleri geçerlidir.


---

## Son inceleme · B İş akışı

Kaynak: `review-workflow.md`

# Prototip incelemesi — B / İş akışı

**İncelenen teslim:** `docs/prototypes/mercek-design-council.html` ve okunur kaynak `.cache/design-council-v4/council.js`. Karşılaştırma otoritesi ortak `ballot.md`, `vote-results.json` ve mevcut `SPEC.md`/mimari sözleşmesidir. Kod değiştirilmedi.

**Sonuç:** İş akışı ve finansal veri sunumu açısından öneri koşullu kabul. Finansal veri uydurma, maliyeti güncel değer yerine kullanma veya sahte AI raporu bakımından yüksek önem bulgu görmedim. W01’in düzeltilmesi ya da gerçek etkileşim kanıtıyla giderildiğinin gösterilmesi gerekiyor. Bu, ürünün üretime hazır olduğu veya kullanıcı tarafından onaylandığı anlamına gelmez.

## Gerçekte incelenen kanıt ve sınır

Görüntü aracıyla `mercek-council-desktop.png`, `mercek-council-financials.png`, `mercek-council-mobile.png`, `mercek-council-ai.png` ve `mercek-council-source-wide.png` dosyalarını açtım. Masaüstü genel bakış, geniş finansal tablo, mobil AI düzeni ve isteğe bağlı kaynak sütununu görsel olarak değerlendirdim. Diğer sayfaların şablonlarını JS kaynağından okudum; Bugün, Portföy, İzleme ve Günlük için bu incelemede ayrı ekran görüntüsü açmadım.

Canlı tarayıcı etkileşimi, mobil dokunma, odak sırası veya API entegrasyonu çalıştırmadım. Bunlar ana agent’ın sürmekte olan doğrulamasına ait. Kaynak URL’si, belge başlığı ve tablo değerlerinin etiketleri görünür; Microsoft raporunun tüm değerlerini bu turda bağımsız olarak yeniden indirmedim. Dolayısıyla kaynakla sayısal mutabakatın tamamlandığını bu incelemeye dayanarak iddia etmiyorum.

## Somut bulgular

### W01 — Orta: Seçili araştırma sekmesi yeniden çizimden sonra görünür kalmıyor

**Kararlar:** D07, D08; ilişkili D05 ve D15.

**Kanıt:** Mobil ekran görüntüsünde içerik “AI raporu” iken şeritte Genel bakış, Grafik, Finansallar, Risk ve Haberler okunuyor; aktif AI etiketi sağdaki görünmeyen alanda, yalnız mavi çizginin ucu görülüyor. Kaynakta `setTab()` seçimden sonra `scrollIntoView()` çalıştırıyor; fakat `render()` bütün `main.innerHTML` içeriğini yeniden oluşturuyor. İzleme ekleme/kaldırma, geniş kaynak panelini açma ve başka kontrollerdeki yeniden çizimler seçili sekmeyi yeniden görünür alana taşımıyor.

**Tekrarlama koşulu:** Dar ekranda AI raporu sekmesini seç; “İzleme listesine ekle” ile yeniden çizimi tetikle. İçerik AI olarak kalırken yeni oluşturulan yatay şeridin başlangıç konumu aktif etiketi saklayabilir. Mobil görsel bu görünüşü zaten sergiliyor; canlı adımlar tarafımdan çalıştırılmadı.

**Kabul koşulu:** Aktif etiket seçimde ve ilgili yeniden çizimlerde tam okunur kalmalı. Genel bakış, AI ve geri dönüş akışının dar ekran görüntüsü veya taze etkileşim kontrolüyle doğrulanması yeterlidir. Sekme sırasını ya da oy sonucunu değiştirmek gerekmez.

### W02 — Düşük: Grafik tasarımı mevcut kontrollerin yalnız bir kısmını temsil ediyor

**Kararlar:** D07, D08; mevcut `ChartWorkspace` kapsamı.

JS’de Grafik sekmesi 1M/3M/6M/1Y, Çizgi/Alan ve kapalı Mum kontrolünü gösteriyor. Mevcut çalışma alanındaki 1D/5D/YTD, Heikin Ashi ve SMA20/SMA50 bu tasarımda temsil edilmiyor. Görünüm açıkça “Arayüz önizlemesi” olduğu için çalışır özellik kaybı veya uydurma veri değildir. Ancak bu prototip “grafik arayüzünün tamamının üretime taşınacak tasarımı” diye sunulmamalı. Uygulama aşamasında mevcut kontrollerin yerleşimi tamamlanmalı; veri gözlem sıklığı ve dönüştürülmüş Heikin Ashi açıklaması korunmalı.

## Kabul edilen eşleşmeler

- **D01–D04, D12–D13:** Açık finansal yüzey, grafit kabuk ve kobalt seçim görselde mevcut. Tablo satırları düzenli, sayılar sağa hizalı. Piksel ve kontrast ölçümünü ana doğrulama kaydı taşımalı.
- **D05:** Finansallar görüntüsünde tablo geniş; kaynak açık görüntüde sağ sütun var. JS hem `innerWidth>=1440` hem kalan genişlik `>=900` koşulunu birlikte kontrol ediyor; başlangıç kapalı. Eşik geçişinin gerçek ölçümü bu turda çalıştırılmadı.
- **D06, D11:** Bugün kaynağında kompakt piyasa şeridi ardından portföy metrikleri, performans/dağılım, pozisyonlar ve haber/takvim bulunuyor. Üç özet etiketi doğru; bilinmeyen değer, maliyet ve kapsam `—`. Portföy okunmadığından sıfır pozisyon veya sahte ara toplam gösterilmiyor.
- **D07–D08, D18:** Altı sekme doğru sırada; başlangıç Genel bakış. Kaynaklı mali rapor grafiği açıkça “fiyat grafiği değildir” diyor. Bu HTML’in açılışı gerçek uygulamanın varsayılan rotasını değiştirmiyor.
- **D09–D10, D17:** Kayıtlı varlık kapsamı arama etiketinde; nesneli ekleme/kaynak/işlem metinleri korunmuş. İşlem diyaloğu gerçek emir üretmiyor. Hash bağlantıları prototip içi gezinmedir; üretim route değişikliği yoktur.
- **D14:** Günlükte oturum ve yenileme kaybı açık; “Taslağı önizle” kullanıcı metnini kaçışlayarak gösteriyor. Kalıcı günlük başarısı veya AI metni üretilmiyor. Bu yüzey mevcut kalıcı günlük formunun bütün alanlarını doğrulayan örnek sayılmaz.
- **D16:** Temel, Teknik, Risk, Boğa, Ayı, Portföy Yöneticisi sırası doğru. Roller açıklama olarak sunuluyor; tamamlandı durumu, süre veya sahte ilerleme yok. Risk, fiyat, haber ve portföy verisinin bağlı olmadığı açıkça yazılı.

## Korunan karşı oy

D03’te açık sidebar tercihimi koruyorum. Masaüstü görselde grafit sol blok beş görev için hâlâ baskın geliyor; çoğunluğun seçtiği kabuğun uygulanmasını hata saymıyorum. Bu, W01’den ayrı bir tasarım karşı görüşüdür. Kalıcı kaynak paneline önceki itirazım ise kapalı başlangıç ve genişlik koşullarıyla karşılanmış görünüyor.

## Düzeltme sonrası — hedefli kapanış

Yeni `mercek-council-mobile-ai.png` görselini gerçekten açtım: izlemeye ekleme bildirimi ve “İzleme listemde” durumu varken **AI raporu** etiketi artık tam okunuyor ve aktif çizgisi görünür. Güncel JS’de `revealSelectedTab()` hem `render()` hem yeniden boyutlandırma sonunda çağrılıyor. İlk incelemedeki W01, bu hedefli görsel ve kaynak kanıtıyla **kapandı**.

Grafik şablonunda 1D/5D/1M/3M/6M/YTD/1Y dönemleri ve SMA20/SMA50 seçimleri bulunuyor. Mum ve Heikin Ashi, OHLC yokluğunda kapalı; Heikin Ashi’nin dönüştürülmüş gösterim olduğu ve seçimlerin fiyat/gösterge hesabı yapmadığı açıklanıyor. W02’nin temsil eksikliği **kapandı**; bu, gerçek grafik verisi veya hesap entegrasyonu doğrulaması değildir.

Ana agent’ın `.cache/design-council-v4/verification-results.json` kaydını okudum: 22 grup, çıkış kodu0, bütün durumlar pass, hata ve dış ağ isteği listeleri boş. Kayıt aktif mobil sekmenin yeniden çizim sonrasında görünürlüğünü de kapsıyor. Testleri ben yeniden çalıştırmadım; bu ayrım korunuyor. İnceleme sonucu artık **prototipin iş akışı sunumu için kabul**; üretim hazırlığı veya kullanıcı onayı değildir. İlk bulgular ve D03 açık sidebar karşı oyum yukarıda değiştirilmeden duruyor.


---

## Son inceleme · C Etkileşim

Kaynak: `review-interaction.md`

# C — Prototip etkileşim incelemesi

**Karar: Koşullu kabul.** Aşağıdaki dört orta önem bulgusu düzeltilip belirtilen kontrollerle doğrulanırsa etkileşim yönünü kabul ediyorum. Bu kayıt, inceleme sırasında okuduğum sürümü anlatır; moderatörün sonradan yapacağı düzeltmeler ayrı çözüm kaydında yer almalıdır. Üretim kodunu veya prototipi değiştirmedim.

## Kanıt ve sınır

`docs/prototypes/mercek-design-council.html` için `.cache/design-council-v4/council.js`, `council.css`, `template.html` ve `verify.cjs` okundu. `mercek-council-mobile.png` ve `mercek-council-source-wide.png` görüntüleri açıldı. Geniş görüntü, Finansallar ile 280px kaynak panelini; mobil görüntü beş görevli alt menüyü ve açık AI bölümünü gösteriyor. Tam sayfa mobil görüntüde sabit alt menünün araya girmesi tek başına kalıcı içerik kaybı kanıtı değildir.

Mevcut `verification-results.json`, `2026-10-17T16:22:29.454Z` zamanında 19 grup, çıkış kodu 0, sayfa hatası ve dış istek olmadığını bildiriyor. Bu testleri ben çalıştırmadım; kayıt ve test içeriğini inceledim. Ek tarayıcı testi yapılmadı. Aşağıdaki davranış bulguları kaynak akışından çıkarılmıştır; ayrı etkileşim tekrarı yaptığım iddia edilmez.

## Bulgular

### C-01 — Orta: Panel daralınca açan kontrole odak dönüşü kaybolabilir — D05

`council.js:123`, açık nonmodal panel daralınca `render()` çağırıp ardından `openSource()` çalıştırıyor. Yeniden çizim odaktaki panel başlığını/kontrolünü DOM’dan kaldırıyor. `openSource()` satır 67’de açanı yeniden `document.activeElement` üzerinden alıyor; bu noktada eski düğme yerine body kaydedilebilir. Modal kapatıldığında satır 75/120 geçerli kaynak düğmesine dönmeyi garanti etmiyor.

**Kabul koşulu:** 1440px’de kaynak paneli açık ve panel içinde odak varken viewport 1280px’e düşürülmeli; modal açılmalı, Escape sonrası yeni `#source-opener` odaklanmalı ve `aria-expanded=false` olmalı. Mantıksal açan kontrol yeniden çizim boyunca korunmalı. D05’in iki eşik koşulu birlikte kalmalı.

### C-02 — Orta: Bazı mobil hedefler 44px altında — D12/D15/D17

Mobil CSS’te `.search-button` 40px, `.source-strip .btn` 42px, `.segmented button` 40px tanımlanıyor; `.text-link` temel kuralı 30px. Genel `.btn` 44px kuralı bu daha özel tanımları geçersiz kılmıyor. Beş görevli alt menü ise son CSS kuralıyla 12px metin ve en az 74px yükseklik taşıyor; bu bölüm uygun.

**Kabul koşulu:** 390px’de arama, kaynak düğmesi, dönem/görünüm/yoğunluk kontrolleri ve bağımsız eylem bağlantılarının gerçek kutuları en az 44px hedef sağlamalı. Kaydırılabilir sekmelerin klavye davranışı korunmalı. Yazıyı küçülterek telafi yapılmamalı.

### C-03 — Orta: İçeriğe geç bağlantısı sayfa değiştiriyor — D09

`template.html:12` bağlantısı `#main` hedefliyor. `council.js:122` bütün hash değişikliklerini sayfa anahtarı sayıyor ve tanınmayan `main` değerini `arastir`e çeviriyor. Günlük veya Portföy’de bağlantıyı kullanmak mevcut sayfanın içeriğine geçmek yerine Araştır’ı çiziyor.

**Kabul koşulu:** Günlük’te klavyeyle “İçeriğe geç” etkinleştirildiğinde Günlük görünümü korunmalı, odak mevcut ana içeriğe gitmeli. Aynı kontrol Portföy’de de çalışmalı.

### C-04 — Orta: Arama modalında Enter kapatma düğmesini aşabiliyor — D10

`council.js:108–109`, arama modalı açıkken Enter’ı olay hedefinden bağımsız yakalıyor. Sonuç varsa kapatma düğmesi odaktayken Enter da sonucu seçebilir. Escape yolu bulunması düğmenin klavyeyle doğru çalışması gereğini kaldırmıyor.

**Kabul koşulu:** Enter yalnız arama alanında/seçili sonuçta sonuç açmalı; kapatma düğmesinde modalı kapatmalı. Tab odağı modal içinde kalmalı; kapatınca aramayı açan kontrol geri gelmeli.

## Kabul edilen uygulama

Primary yalnız günlük önizlemesinde baskın; ekleme ikincil, silme nesnesi açık ve kırmızı. Altı araştırma sekmesi sırası, `aria-selected`, roving tabindex ve ok/Home/End davranışı kaynakta mevcut. Mum disabled ve neden metniyle bağlı. Tablo başlıkları, kaydırma bölgesi adları, native dialog başlıkları ve sonuç sayısının canlı duyurusu yerinde. Kaynak açılışı `innerWidth>=1440 && layout.clientWidth-296>=900` hesabıyla 280px panel ve 16px aralığı içeriyor; başlangıç kapalı. Geniş panel modal odak tuzağı kurmuyor, dar görünüm `showModal()` kullanıyor.

**D14 karşı oyum korunuyor:** B etiketini tercih etmiştim. Kazanan “Taslağı önizle” metni doğru uygulanmış; oturum sınırı, yenilemede silinme ve sunucuya kaydedilmeme açık. Önizleme kullanıcı metnini kaçışlayarak gösteriyor, sahte kayıt başarısı veya AI sonucu üretmiyor. Bu nedenle D14 için düzeltme istemiyorum.

## Düzeltme sonrası — dört koşul kapandı

Güncellenen kaynakları, `verify.cjs` içindeki hedefli regresyon kontrollerini ve `verification-results.json` kaydını yeniden okudum. Son kayıt **2026-10-17T16:26:07.826Z**, **22 grup**, **çıkış kodu 0**, boş hata ve dış istek listesi bildiriyor. Komutları ben yeniden çalıştırmadım; ana agentın taze çıktısı ve ilgili test gövdeleri bu kapanışın kanıtıdır.

- **C-01 kapandı — D05:** `openSource(opener)` açık bir kontrol kabul ediyor; resize sonrası yeniden çizilen `#source-opener` aktarılıyor. Test, geniş paneli açıp 1280px’e daraltıyor, modalın açılmasını bekliyor, Tab/Escape ve kaynak düğmesine odak dönüşünü denetliyor. İki genişlik koşulu korunmuş. Kaynak düğmesinin `aria-controls` bağı da eklenmiş.
- **C-02 kapandı — D12/D15/D17:** Son mobil CSS kuralı arama, kaynak, segmented kontroller ve eylem bağlantılarını 44px’e çıkarıyor. Regresyon testi mobil arama/kaynak/şirket bağlantısı ile bütün grafik segmented butonlarının gerçek yüksekliklerini ölçüyor. Seçili araştırma sekmesinin her render sonrasında görünür olması ayrıca kontrol ediliyor.
- **C-03 kapandı — D09:** Skip bağlantısı click işleyicisinde varsayılan hash değişimi durduruluyor; mevcut `main` odaklanıyor. Test Günlük hash’inin korunduğunu ve odağın ana içerikte olduğunu doğruluyor. Ortak işleyici Portföy için de aynı davranışı sağlıyor.
- **C-04 kapandı — D10:** Arama Enter/ok işleyicisi yalnız `#search-input,.search-result` hedefleriyle sınırlı. Test kapatma düğmesine odak verip Enter ile dialogun kapandığını ve Günlük görünümünün korunduğunu doğruluyor.

**Güncel karar: Etkileşim kapsamı kabul.** İlk bulgular tarihsel inceleme kanıtı olarak yukarıda korunuyor; açık düzeltme koşulu kalmadı. Bu kabul HTML prototipinin incelenen kapsamına aittir; üretim geçişi veya bütün erişilebilirlik gereksinimleri için genel sertifika değildir. D14 karşı oyum değişmedi; kazanan seçenek doğru uygulanıyor.


---

## Moderatör · son inceleme bulgularının karşılıkları

Kaynak: `review-resolution.md`

# Moderatör — son inceleme bulgularının karşılıkları

Üç ayrı agent prototipi kendi alanından inceledi. İlk inceleme metinleri değiştirilmeden korundu; agentların düzeltme sonrası değerlendirmeleri aynı dosyaların sonuna eklendi. Aşağıdaki düzeltmeler oylanan yönü uygulamak içindir; yeni oy veya moderatör oyu eklenmedi. D03 açık sidebar ve D14 daha açık oturum etiketi karşı görüşleri geçerliliğini korur.

| Bulgu | Yapılan düzeltme | Doğrulama kanıtı |
|---|---|---|
| V01 / D12 — küçük yardımcı metin | Şirket bağlamı, kurul açıklaması, oturum bilgisi, mobil piyasa/portföy notu ve kurul istatistik açıklaması 12px ölçeğine getirildi. | Güncel masaüstü/mobil görüntüler; mobil piyasa ve portföy notunun hesaplanan font boyutu kontrolü; A'nın düzeltme sonrası incelemesi. |
| V02 ve W01 / D07–08 — seçili sekmenin kaybolması | Her yeniden çizimde ve genişlik değişimi tamamlandığında seçili araştırma etiketi yatay şeritte görünür konuma alınıyor. | Mobil AI seçimi → izleme ekleme → yeniden çizim akışında etiketin sınırları şeridin içinde; `mercek-council-mobile-ai.png`. |
| C-01 / D05 — panel daralınca odak dönüşü | Yeni DOM'daki mantıksal kaynak açıcı korunuyor; modal Escape ile kapandığında bu düğmeye odak dönüyor. `aria-controls` geçerli kaynak yüzeyini işaret ediyor. | 1440px nonmodal →1280px modal →Escape →açan düğmeye odak testi. |
| C-02 / D12–15–17 — mobil hedefler | Arama, kaynak, segment kontrolleri, bağımsız eylem bağlantıları ve gelişme kontrolleri en az 44px yapıldı. Font küçültülmedi. | 390px'de arama/kaynak/bağlantı ve bütün grafik segmentlerinin gerçek kutu yüksekliği; 320px taşma kontrolü. |
| C-03 / D09 — içeriğe geç | Bağlantı hash rotasını değiştirmeden mevcut `main` öğesine odak taşıyor. | Portföy ve Günlük'te klavyeyle etkinleştirme, aynı hash ve `main` odağı. |
| C-04 / D10 — aramada Enter | Sonuç açma işleyicisi yalnız arama alanı/sonuç düğmesinde çalışıyor; kapatma düğmesinin Enter davranışı korunuyor. | Günlük'te aramayı aç → kapatma düğmesine odak → Enter; modal kapanır, sonuç/başka sayfa açılmaz. |
| W02 / D07–08 — mevcut grafik kontrollerinin eksik temsili | 1D, 5D, YTD; Heikin Ashi; SMA20/SMA50 eklendi. OHLC gerektiren görünümler açıklamayla devre dışı. Heikin Ashi'nin dönüşüm olduğu belirtilir. | Yedi dönem, iki gösterge seçimi ve disabled Mum/Heikin Ashi kontrolü. Bunlar arayüz önizlemesidir; fiyat ya da gösterge hesabı üretilmez. |

## Ana doğrulamada bulunan iki ek sorun

- Tam sayfa ekran yakalama sırasında Chromium geçici 1×1 resize olayı ürettiği için geniş kaynak paneli modal çekmeceye dönüşüyordu. Olaylar kaydedilerek neden doğrulandı. Genişlik değerlendirmesi 100ms sakinleşme sonrasına alındı; gerçek daralma davranışı ve tam sayfa yakalamada panelin korunması tekrar kontrol edildi.
- Native dialog Escape kapanışında `aria-expanded` güncellemesi asenkron close olayını bekliyordu. Cancel olayı ortak kapatma yoluna alındı; modal durumu ve odak/ARIA birlikte güncellenir.

Buton kataloğundaki primary örneği de gezinme bağlantısı yerine açıklayıcı bildirim veren gerçek buton yapıldı. Gerçek önizleme eylemi Günlük formunda kalır.

## Teslim sınırı

Son incelemelerde finansal veri uydurma veya sahte AI raporu yönünde yüksek önem bulgu bildirilmedi. Sonuç bir frontend tasarım önerisi ve bağımsız HTML'dir. Önerilen ekran gruplaması gerçek uygulamanın entegrasyonu sayılmaz; kullanıcı hesabı ve canlı finans sağlayıcısı bağlı değildir. Bu oturumda üretim kaynak kodu değiştirilmedi. Son komut sonucu ve kontrol kapsamı [doğrulama kaydında](verification.md) bulunur.


---

## Moderatör · doğrulama ve sınırlar

Kaynak: `verification.md`

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


---

## Tur 3 — 54 oyun kaynak JSON dosyaları

### votes-visual.json

```json
{
  "agent": "visual",
  "votes": [
    {"id":"D01","choice":"A","reason":"Uzun tablo ve raporlar için beyaz ortak araştırma yüzeyini tercih ediyorum.","reservation":"Karanlık odada parlaklık farkı oluşur."},
    {"id":"D02","choice":"A","reason":"Kobalt etkileşimi finansal yön ve amber veri uyarısından ayırır.","reservation":"Tek başına ayırt edici marka kimliği oluşturmaz."},
    {"id":"D03","choice":"A","reason":"Dar grafit kabuk beş ana görevi şirket araştırması kontrollerinden ayırır.","reservation":"B'nin açık sidebar tercihinin daha sakin parlaklık geçişi avantajını kabul ediyorum."},
    {"id":"D04","choice":"A","reason":"40px okunurluğu, 32px kullanıcı tercihiyle daha çok satırı destekler.","reservation":"İlk açılışta daha az satır görünür; mobil eylem hedefleri ayrıca korunmalı."},
    {"id":"D05","choice":"A","reason":"Geniş ekranda kaynak ile kanıtı birlikte okumayı sağlar; dar ekranda tablo alanını korur.","reservation":"Modal ve modal olmayan odak davranışları farklı uygulanmalı."},
    {"id":"D06","choice":"A","reason":"Mevcut portföy kanıtından hareket eder; desteklenmeyen araştırma kuyruğu gerektirmez.","reservation":"Portföyü olmayan kullanıcının boş durumu ayrıca anlamlı olmalı."},
    {"id":"D07","choice":"A","reason":"Genel bakıştan fiyat bağlamına ve ayrıntılı finansallara ilerleyen diziyi tercih ediyorum.","reservation":"Uzun vadeli analist finansalları daha erken isteyebilir; bölüm derin bağlantıları önemlidir."},
    {"id":"D08","choice":"A","reason":"Genel bakış farklı varlık türlerine ve araştırma sorularına uygun giriş sağlar.","reservation":"Genel bakış gereksiz metrik kartlarıyla şişmemeli."},
    {"id":"D09","choice":"A","reason":"Görüntüleme ekranında primary zorunluluğu eylem rekabeti yaratır; formdaki kayıt önceliklidir.","reservation":"Primary bulunmayan ekranlarda bağlantıların bulunabilirliği korunmalı."},
    {"id":"D10","choice":"A","reason":"Arama etiketinde gerçek mevcut varlık kapsamını baştan söyler.","reservation":"Genel piyasa araması sonradan eklenirse label yeniden değerlendirilmelidir."},
    {"id":"D11","choice":"A","reason":"Güncel değer ile maliyeti açıkça ayırır; fiyat kapsamını kısa ve sürekli görünür kılar.","reservation":"Kapsamın adet mi ağırlık mı olduğu açıklamada belirtilmeli."},
    {"id":"D12","choice":"A","reason":"14px gövde ve 12px yardımcı bilgi araştırma ve kaynak metinlerini okunur tutar.","reservation":"Daha büyük şirket başlığı tek satıra sığmadığında esnemeli."},
    {"id":"D13","choice":"A","reason":"24px kenar, 16px panel arası ve 6px panel radius daha rahat ve tutarlı ölçek kurar.","reservation":"192px sidebar ilk 184px önerimden geniş; dar viewport'ta ana tablo alanı izlenmeli."},
    {"id":"D14","choice":"A","reason":"Taslağı önizle kalıcılık iddiası taşımayan anlaşılır bir eylemdir.","reservation":"Tur2'deki Prototipte saklandı ifademden vazgeçiyorum; önizleme sunucu başarısı gibi görünmemeli."},
    {"id":"D15","choice":"A","reason":"Beş ana görevin her biri doğrudan ve aynı seviyede erişilebilir kalır.","reservation":"Uzun Türkçe etiketler gerçek dar ekranda ölçülmeli."},
    {"id":"D16","choice":"A","reason":"Altı analist sırası ürünün araştırma yapısını görünür kılar; yokluk açık rol durumuyla anlaşılır.","reservation":"Rollerin kartları gerçek zamanlı yürütme telemetrisi gibi sunulmamalı."},
    {"id":"D17","choice":"A","reason":"Nesneyi adlandıran eylemler öğrenme ve erişilebilir ad bakımından daha açıktır.","reservation":"Dar ekranda metin sarabilir; küçük yazıya veya belirsiz ikona dönüştürülmemeli."},
    {"id":"D18","choice":"A","reason":"Kaynaklı gerçek rapor kesitiyle araştırma hiyerarşisini değerlendirmek görsel incelemeyi somutlaştırır.","reservation":"Statik kesit canlı fiyat veya bağlı hesap izlenimi yaratmamalı; Bugün ayrıca erişilebilir olmalı."}
  ]
}

```

### votes-workflow.json

```json
{
  "agent": "workflow",
  "votes": [
    {"id":"D01","choice":"A","reason":"Uzun finansal tablo ve analist metni için açık veri yüzeyi önceliğim.","reservation":"Karanlık ortamda açık yüzey daha parlak kalır."},
    {"id":"D02","choice":"A","reason":"Etkileşimi veri eskiliği ve kısmi kanıt uyarısından ayırır.","reservation":"Kimlik yalnız kobalt renge dayanırsa sıradanlaşır."},
    {"id":"D03","choice":"B","reason":"Beş görevli gezinmede açık menü yeterli; koyu sol bloğun görsel ağırlığını gereksiz buluyorum.","reservation":"Gezinmenin açık veri alanından ayrımı daha zayıftır; seçili zemin, çizgi ve metin birlikte gereklidir."},
    {"id":"D04","choice":"A","reason":"40px varsayılan okunurluk, 32px isteğe bağlı yoğunluk sağlar.","reservation":"İlk açılışta aynı yükseklikte daha az satır görünür."},
    {"id":"D05","choice":"A","reason":"Kalıcı kısa kaynak satırı bulunabilirliği korur; isteğe bağlı panel karşılaştırma genişliğini yalnız yeterli alanda kullanır.","reservation":"1440px ve 900px koşulları birlikte uygulanmalı; 280px panel başlangıçta kapalı olmalı."},
    {"id":"D06","choice":"A","reason":"Mevcut portföy kanıtını ve günlük inceleme sırasını izler; desteklenmeyen araştırma kuyruğu gerektirmez.","reservation":"Portföyü olmayan kullanıcıda oluşturma eylemi ve boş durum anlamlı olmalıdır."},
    {"id":"D07","choice":"A","reason":"Grafik fiyat bağlamından ayrıntılı finansal kanıta geçişi sağlar; ilk iki turdaki sıramı koruyorum.","reservation":"Bu sıra uzun vadeli araştırmayı teknik alım sinyali akışına dönüştürmemeli."},
    {"id":"D08","choice":"A","reason":"Genel bakış hisse ve ETF için finansal tabloyu zorunlu kılmadan ortak başlangıç sağlar.","reservation":"Doğrudan bölüm bağlantıları seçilen görevi açabilmeli."},
    {"id":"D09","choice":"A","reason":"Kayıt eylemiyle sayfaya gitmeyi ayırır; panelde eylem rekabetini azaltır.","reservation":"Görüntüleme ekranında primary buton bulunması zorunlu değildir."},
    {"id":"D10","choice":"A","reason":"Aramanın mevcut kayıt kapsamını kontrol açılmadan açıklar.","reservation":"Tüm piyasa araması ileride gerçekten eklenirse bu label yeniden değerlendirilir."},
    {"id":"D11","choice":"A","reason":"Güncel değer, maliyet ve kapsamı ayrı kavramlar olarak belirginleştirir.","reservation":"Güncel sözcüğünün yanında gözlem zamanı bulunmalı; canlı veri anlamına gelmemeli."},
    {"id":"D12","choice":"A","reason":"12px kaynak bilgisi alt sınırı ve 14px gövde uzun araştırma metnini destekler.","reservation":"Daha az satırı yazıyı küçülterek telafi etmeyelim."},
    {"id":"D13","choice":"A","reason":"İlk turdaki 192px menü ve 24px kenar önerime uyuyor; 16px panel arası dengeli alan bırakır.","reservation":"Dar ekranlarda masaüstü ölçüleri sabit uygulanmamalı."},
    {"id":"D14","choice":"A","reason":"Önizleme sözcüğü kalıcı kayıt yapılmadığını eylemin kendisinde belirtir.","reservation":"Düzenleyicinin yanında yenilemede silinme bilgisi de kalmalı; başarı bildirimi olmamalı."},
    {"id":"D15","choice":"A","reason":"Günlük diğer dört görev kadar doğrudan erişilebilir kalır.","reservation":"Etiketleri sığdırmak için anlaşılmaz kısaltma veya çok küçük metin kullanılmamalı."},
    {"id":"D16","choice":"A","reason":"Analistlerin sabit sırası görünür kalır ve AI raporunun yapısı anlaşılır.","reservation":"Rol başlıkları sonuç varmış gibi görünmemeli; bağlı olmayan prototipte açık veri durumu, sahte ilerleme ve anlatı olmamalı."},
    {"id":"D17","choice":"A","reason":"Kayıt ile emir verme ve kaynak ayrıntısı ile dış kaynak açma ayrımını nesneli etiketler güçlendirir.","reservation":"Uzun etiketlerin mobil yerleşimi sarma ve yeterli hedef alanıyla çözülmeli."},
    {"id":"D18","choice":"A","reason":"Kaynaklı rapor kesiti dolu araştırma yüzeyinin hiyerarşisini değerlendirmeye olanak verir.","reservation":"Açılışın araştırma olması gerçek ürünün Bugün varsayılanını değiştirmez; rapor kesiti canlı hesap verisi değildir."}
  ]
}

```

### votes-interaction.json

```json
{
  "agent": "interaction",
  "votes": [
    {"id":"D01","choice":"A","reason":"Uzun rapor ve tabloyu açık veri yüzeyinde okumayı tercih ediyorum.","reservation":"Karanlık ortamda parlaklık farkı prototipte değerlendirilmeli."},
    {"id":"D02","choice":"A","reason":"Etkileşim rengi finansal yön ve veri uyarısından ayrılıyor.","reservation":"Gerçek token çiftlerinin kontrastı ölçülmeli."},
    {"id":"D03","choice":"A","reason":"Grafit kabuk beş görevi şirket içindeki araştırma kontrollerinden ayırıyor.","reservation":"Koyu kabuğun açık içeriğe göre baskınlaşması izlenmeli."},
    {"id":"D04","choice":"A","reason":"Varsayılan 40px okunurluk, isteğe bağlı 32px daha çok satır sunuyor.","reservation":"Mobil eylemler kompakt satıra sıkıştırılmamalı."},
    {"id":"D05","choice":"A","reason":"Kaynak bağlamı görünürken ayrıntı tablonun zorunlu genişliğini tüketmiyor; yeterli alanda nonmodal panel yararlı.","reservation":"1440px viewport ve 900px kalan tablo koşulları birlikte uygulanmalı; nonmodal panel odak hapsetmemeli, modal drawer hapsetmeli."},
    {"id":"D06","choice":"A","reason":"Mevcut portföy kanıtından başlayan sıra otomatik araştırma önceliği üretmiyor.","reservation":"Portföy yokken tek oluşturma eylemi ve araştırma erişimi anlaşılır kalmalı."},
    {"id":"D07","choice":"A","reason":"Genel bakıştan sonra Grafik, mevcut teknik araştırma akışına anlaşılır erişim veriyor.","reservation":"Dar ekranda tam adların devamı görünür olmalı."},
    {"id":"D08","choice":"A","reason":"Genel bakış farklı hisse ve ETF kanıtlarını tek başlangıçta karşılayabilir.","reservation":"Genel bakış tekrar eden KPI kartlarıyla şişmemeli."},
    {"id":"D09","choice":"A","reason":"Tek baskın kayıt eylemi ve gerçek gezinme linkleri eylem hiyerarşisini açık tutuyor.","reservation":"Görüntüleme ekranının primary butona ihtiyacı olmayabilir."},
    {"id":"D10","choice":"A","reason":"Kayıtlı varlık kapsamını aramadan önce açıklıyor; genel piyasa araması vaat etmiyor.","reservation":"Kısayol metin alanlarında yazmayı kesmemeli."},
    {"id":"D11","choice":"A","reason":"Güncel değer ile maliyetin ayrı adları ve fiyat kapsamı eksik fiyatı açık tutuyor.","reservation":"Ara toplam toplam değer gibi büyük ve açıklamasız sunulmamalı."},
    {"id":"D12","choice":"A","reason":"Yardımcı bilgiyi 12px altına indirmeyen ölçek veri durumu ve kaynağı okunur tutuyor.","reservation":"Yazı büyümesinde satır ve butonlar taşmamalı."},
    {"id":"D13","choice":"A","reason":"24px kenarlar ve 192px menü etiketlerin rahat okunmasına yer veriyor.","reservation":"Küçük ekranlarda masaüstü ölçüleri sabit tutulmamalı."},
    {"id":"D14","choice":"B","reason":"Sunucuya kaydedilmemesi ve yenilemede kaybolması aynı açıklamada somut biçimde belirtiliyor.","reservation":"Taslağı bu oturumda göster ifadesi önizlemeyi kaydetme başarısı gibi sunmamalı."},
    {"id":"D15","choice":"A","reason":"Mevcut beş görev görünür ve eşit erişimde kalıyor; Günlük saklanmıyor.","reservation":"320px genişlikte uzun label kırılması ve hedefler kontrol edilmeli."},
    {"id":"D16","choice":"A","reason":"Mevcut altı rol ve sırası, gerçek çıktı olmadığında açık durumla birlikte anlaşılır kalıyor.","reservation":"Ayrı unavailable satırlar sahte aşama ilerlemesi gibi canlandırılmamalı."},
    {"id":"D17","choice":"A","reason":"Nesneyi adlandıran etiketler kaynağı, liste eklemeyi ve işlem kaydını açıklaştırıyor.","reservation":"Dar alanda metni belirsiz kısaltmaya dönüştürmeden yerleşim uyarlanmalı."},
    {"id":"D18","choice":"A","reason":"Araştırma genel bakışında doğrulanmış rapor kesitiyle görünüş ve hiyerarşi somut değerlendirilebilir.","reservation":"Rapor tarihi ve prototip verisi sınırı görünür olmalı; fiyat veya AI sonucu üretilmemeli."}
  ]
}

```
