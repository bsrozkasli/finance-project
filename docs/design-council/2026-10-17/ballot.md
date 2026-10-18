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
