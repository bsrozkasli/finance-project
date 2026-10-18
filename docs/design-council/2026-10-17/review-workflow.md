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
