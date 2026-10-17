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
