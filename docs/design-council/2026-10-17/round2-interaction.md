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
