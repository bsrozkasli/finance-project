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
