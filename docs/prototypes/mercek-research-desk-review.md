# Mercek Araştırma Masası — tasarım inceleme kaydı

Tarih: 2026-10-17. Son otomatik koşu: 11:14:31 UTC / 14:14:31 Europe/Istanbul.

Teslim: [Etkileşimli HTML](mercek-research-desk.html), [araştırma ve karar planı](../superpowers/plans/2026-10-17-frontend-research-desk-design.md).

Bu teslim bağımsız bir tasarım önerisidir. React, Spring veya FastAPI kaynakları değiştirilmedi. Mevcut kullanıcı değişiklikleri korunarak `design/research-desk-html-20261017` dalında yeni dosyalar oluşturuldu. Commit veya push yapılmadı.

## İncelenen referanslar

- Ghostfolio: commit `b09925eaf1c5b5d5aa568aa88d90cfc097702ac2`, `home-page.html` ve `home-overview.html`. İlk kullanım / veri hazır ayrımı.
- Wealthfolio: commit `a9177a261253de24f0dcb8799971c1813c2a9e50`, `dashboard-content.tsx` ve `portfolio-page.tsx`. Değerleme durumu, kaynak zamanı, null getiri ve odak kontrolü.
- OpenBB: resmî README. Açık kaynak veri altyapısı ile Workspace ürününün ayrımı. Workspace frontend kodu incelendiği iddia edilmez.
- Koyfin: My Dashboards yardım sayfası ve resmî ürün ekranı.
- TradingView: resmî Watchlists yardım sayfası. Canlı Supercharts oturumu açılmadı.
- Quartr: resmî ürün sayfası; kaynak kartı ve transkript/belge ekran görselleri.

Bağlantılar ve gözlem → çıkarım → tasarım kararı eşlemeleri plan dosyasında ve HTML'in “Tasarımın arkasındaki fikir” bölümündedir. “Neden” açıklamaları kullanıcı araştırması sonucu veya platformların kendi gerekçesi olarak sunulmaz.

## Bağımsız HTML doğrulaması

Komut: `node .cache/design-research-2026-10-17/review-prototype.cjs`

Yerel headless Chromium ve Playwright kullanıldı. HTTP(S) istekleri test sırasında engellendi; dış istek sayısı sıfır. Gerçek finansal sağlayıcılar veya kullanıcının portföy API'si çağrılmadı. Çıkış kodu **0**, sonuç **15 kontrol grubu geçti**.

| Kontrol | Sonuç |
|---|---|
| Bugün ekranı ve altı gerçek tarihsel veri çubuğu | Geçti |
| Araştırma sekmeleri ve sol/sağ ok ile gezinme | Geçti |
| Bağlı değil / yükleniyor / hata / kısmi veri görünümleri | Geçti; fiyat, getiri ve volatilite `—` kaldı |
| Kaynak penceresi, resmî rapor bağlantısı, Escape ile kapama | Geçti |
| İzlemeye ekle → listeyi aç → çıkar | Geçti |
| Ctrl K araması, eşleşme yok durumu, MSFT'ye geçiş | Geçti |
| Not yazma, kaydetme ve ekran değiştirince oturum içi koruma | Geçti |
| Kullanıcı notundaki HTML metninin çalıştırılmadan gösterimi | Geçti |
| Masaüstü odak moduna girme ve çıkma | Geçti |
| Altı görünüm × 320, 390, 768, 1024, 1440, 1920 px | 36 görünüm/genişlik birleşiminde sayfa yatay taşması yok |
| Axe WCAG 2 A/AA ve 2.1 AA kuralları | 390 ve 1440 px'de altı görünümün her birinde otomatik ihlal yok |
| Yenileme sonrası oturum verilerinin sıfırlanması | Açıklanan davranışla uyumlu |
| Altı referansın tasarım defterinde bulunması | Geçti |
| JavaScript sayfa hatası | 0 |
| Haricî HTTP(S) isteği | 0 |

İlk kontrol koşusunda bir doğrulama seçicisi, MSFT bağlantısının erişilebilir adındaki şirket adını hesaba katmıyordu; seçici düzeltildi. Ardından otomatik kontrol adım numaralarında kontrast sorunu buldu; renk düzeltildi. Görsel incelemede mobil grafik etiketleri küçük bulundu; büyütüldü, mobil ana düğmeler ve pencere kapama hedefleri en az 44px yapıldı. Son koşu bu değişikliklerden sonra alındı.

## Görsel inceleme

Masaüstü Bugün ve Araştır ekranları, tasarım kararları görünümü ve mobil Bugün ekranı PNG olarak render edilip görsel olarak incelendi. Mobilde beş görevli menü alt kenarda sabittir. Tam sayfa ekran görüntüsünde sabit menünün ilk viewport'un altındaki konumda görünmesi tarayıcı görüntüleme davranışıdır; gerçek gezinmede ekranın altında kalır.

- [Masaüstü görünümü](mercek-research-desk-desktop.png)
- [Araştırma görünümü](mercek-research-desk-research.png)
- [Mobil görünüm](mercek-research-desk-mobile.png)
- [Tasarım gerekçeleri](mercek-research-desk-rationale.png)

## Veri ve kapsam

Finansal örnekler Microsoft 2025 Annual Report'taki FY2023–FY2025 gelir ve net kâr, FY2025 EPS ve raporlanan gelir büyümesidir. Kaynak bağlantısı, mali yıl sonu ve birimler görünürdür. Bu tarihsel kesit güncel rapor, güncel fiyat, kullanıcı portföyü veya yatırım tavsiyesi olarak sunulmaz.

İzleme listesi ve günlük yalnız açık dosya oturumunda tutulur. Dosya yenilenince sıfırlanır. Hesap, güncel fiyat, haber, risk hesabı veya AI çıktısı bağlı değildir. Altı görünümden beşi ürün ekranı, biri tasarım karar defteridir.

Bu otomatik denetim tam erişilebilirlik sertifikasyonu değildir. Uygulamaya geçilirse gerçek veri akışı, ekran okuyucu ile manuel kullanım ve `docs/agent/verification.md` içindeki frontend lint/coverage/build/E2E ve ilgili smoke kontrolleri ayrıca gerekir. Ürün runtime'larına dokunulmadığı için bu teslimde o kontroller çalıştırılmadı.
