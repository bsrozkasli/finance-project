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
