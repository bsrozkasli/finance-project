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
