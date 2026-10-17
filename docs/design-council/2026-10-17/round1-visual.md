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
