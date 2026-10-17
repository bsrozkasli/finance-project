# Mercek V3 — görsel frontend revizyonu doğrulaması

2026-10-17 · Son koşu: 11:45:19 UTC / 14:45:19 Europe/Istanbul.

[HTML](mercek-terminal-visual.html) · [Görsel analiz ve plan](../superpowers/plans/2026-10-17-frontend-visual-terminal-revision.md)

## Yapılan değişiklik

Kullanıcının görsel benzerlik düzeltmesi üzerine TIKR Detailed Financials, Koyfin Financial Analysis ve TradingView Market Summary / Watchlist ekranları resmî yayımlanmış görseller üzerinden incelendi. Renkler PNG'lerden örneklendi; yazı hiyerarşisi, tablo yoğunluğu, yüzeyler ve panel oranları karşılaştırıldı. Uygulama ekranları açılıp görsel olarak incelendi; canlı hesap oturumu kullanılmadı.

Yeni HTML'de beyaz/soğuk gri yüzeyler, kömür üst bar, açık sidebar, amber seçim vurgusu, sans başlıklar ve kompakt finansal tablo var. Araştırma varsayılan olarak Finansallar sekmesiyle açılıyor. Dashboard piyasa/portföy/performans/dağılım/pozisyon bölgelerini gösteriyor. “Görsel analiz” görünümünde üç resmî ekranın kendisi, örneklenen paletler, gözlem ve tasarım çıkarımları bulunuyor.

Kaynak ekranlardaki piyasa değerleri yalnız referans görselin içindedir ve Mercek verisi olarak sunulmaz. Önerideki Microsoft tablosunun 8 satırı resmî FY2025 yıllık raporunun FY2023–FY2025 Income Statements bölümünden alındı: toplam gelir, satışların maliyeti, brüt kâr, Ar-Ge, faaliyet kârı, vergi öncesi kâr, net kâr, seyreltilmiş EPS. EPS USD, diğer tablo değerleri milyon USD; grafik milyar USD. Hesap/piyasa/portföy verisi bağlı değildir.

## Taze komut kanıtı

Komut: `node .cache/design-research-2026-10-17/review-visual-v3.cjs`

Çıkış kodu: **0**. Sonuç: **15 kontrol grubu geçti**.

- Varsayılan Microsoft Finansallar ekranı, 8 kaynak satırı ve kompakt/rahat satır aralığı kontrolü geçti. Satır aralığı değişince sayısal veri aynı kaldı.
- Araştırma sekmeleri, ok tuşları, dört veri durumu ve kaynak penceresi/Escape kontrolleri geçti.
- İzlemeye ekleme/çıkarma, Ctrl K araması, eşleşme yok durumu, not kaydı, gezinme sırasında oturum koruma ve HTML metninin çalıştırılmadan gösterimi geçti.
- Masaüstü odak moduna girme/çıkma geçti.
- Altı görünüm × 320/390/768/1024/1440/1920 px = 36 birleşimde sayfa yatay taşması yok. Tablolar gerektiğinde kendi bölgesinde kayıyor.
- 390 ve 1440 px'de altı görünümün tamamı Axe WCAG 2 A/AA ve 2.1 AA otomatik kurallarında ihlalsiz geçti.
- İlk koşuda mobil dashboard'daki yatay kaydırılabilir tablonun klavye odağı eksikti. Kaydırılabilir tablo kaplarına `tabindex="0"` eklenip son koşu yeniden alındı.
- Üç resmî referans görseli HTML içinde mevcut. Dış HTTP(S) isteği **0**, JavaScript sayfa hatası **0**. Testte ağ engellendi; canlı finansal sağlayıcı çağrılmadı.
- Yenileme sonrası oturum verisinin sıfırlanması açıklanan davranışla uyumlu.

## Görsel kanıtlar

- [Araştırma / finansallar masaüstü](mercek-terminal-visual-desktop.png)
- [Genel bakış sekmesi masaüstü](mercek-terminal-visual-research.png)
- [Dashboard mobil](mercek-terminal-visual-mobile.png)
- [Gerçek referans ekranları ve karar karşılaştırması](mercek-terminal-visual-rationale.png)

Bu dört PNG render edilip görsel olarak incelendi. Mobil menü ekran altında sabittir; tam sayfa PNG'de ilk viewport altında görünür. Otomatik tarama tam erişilebilirlik sertifikasyonu değildir.

Yalnız bağımsız HTML ve tasarım belgeleri eklendi. Ürün runtime'ları değiştirilmediği için frontend uygulamasının lint/coverage/build/E2E kontrolleri bu teslimde çalıştırılmadı. Bunlar üretime uygulama aşamasının zorunlu kontrolleridir. Önceki HTML karşılaştırma için korunuyor.
