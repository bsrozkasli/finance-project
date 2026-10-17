# Tur 1 — B: Yatırımcı iş akışı, sayfa mimarisi ve finansal veri

Bu, diğer uzmanların görüşlerini okumadan hazırladığım bağımsız tasarım konuşmasıdır; son oylama değildir. Tercihim, beş ana görevi koruyan, Bugün ekranında inceleme sırasını belirginleştiren ve Araştır ekranında seçilen kanıta geniş alan veren bir çalışma alanı. Mevcut kodla yeni yerleşim önerilerini ayırıyorum. Üretim koduna dokunmadım.

## Görsel kanıt ve projeyle eşleşme

`tikr-financials.png`, `koyfin-dashboard.png` ve `koyfin-financials.png` dosyalarını gerçekten açıp inceledim. Bunlar tarihsel ürün ekranı referanslarıdır; canlı hesaba girip güncel arayüzü kullandığım anlamına gelmez. Fiscal.ai için 403 sınırı var; Stock Rover ekranı yok. Bu ikisinin tablo, buton veya yoğunluğunu görmüş gibi değerlendirmiyorum.

TIKR ekranında şirket kimliği solda, fiyat ve zaman sağda; araştırma sekmeleri bunların altında. Dönem, para birimi ve gösterim birimi tablo başlamadan okunabiliyor. Aynı şirket bölümlerinin hem solda hem yatay menüde tekrarlanması ise bize taşınmamalı. Koyfin finansal ekranı daha az üst boşlukla daha fazla satır gösteriyor. Grup başlığı, alt metrik girintisi ve sağa hizalama, kart sayısı artırmadan hiyerarşi kuruyor. Koyfin dashboard’unda soldaki uzun liste ile sağdaki iki grafik eşzamanlı karşılaştırmayı destekliyor; fakat her panelin ayrı araçları, kişisel araştırma akışımızda gereksiz kontrol rekabeti yaratabilir.

Mevcut `DashboardHome` araştırmaya davet eden büyük bir alanın ardından ikinci portföy başlığı ve tekrar metrikler gösteriyor. İlk ekranın görevi iki kez anlatılıyor. `ChartWorkspace` ise grafiğe ve 256 piksel sembol listesine odaklanıyor; bu, temel araştırmanın tamamı sayılamaz. Finansal, risk, haber ve rapor erişimini aynı sembol bağlamında buluşturmalıyız. V3’ün sans yazı ve düzenli tablo yönü yararlı; üç araştırma sekmesi ve sürekli kaynak/not sütunu mevcut araştırma kapsamını fazla küçültüyor. Microsoft rapor örneği de ETF araştırmasının yerleşimini doğrulamıyor.

## İki mimari seçeneği

**A: Panel terminali.** Bugün; portföy metrikleri, büyük performans grafiği, dağılım, pozisyonlar ve haberlerden oluşur. Araştır; aynı anda grafik, metrik tablosu ve sağ bağlam paneli gösterir. Koyfin dashboard’uyla akraba olan bu seçenek, sürekli açık geniş monitörde hızlı tarama sağlar. Bedeli, ilk ziyarette nereden başlanacağının belirsizliği ve finansal tablonun daralmasıdır.

**B: Göreve göre odaklanan araştırma alanı.** Bugün, portföy durumundan takvim ve ilgili habere ilerler. Araştır, şirket başlığını sabit tutar; seçilen sekme ana yüzeyi devralır. Finansallarda tablo tam genişler, grafikte yardımcı sembol listesi açılabilir. B’yi tercih ediyorum. Kullanıcı uzun vadeli ABD hisse/ETF araştırması yapıyor; her veri sınıfına aynı anda küçük kutular vermek yerine incelenen kanıtı okunur büyüklükte tutmak daha uygun.

Bu tercih, otomatik öncelik puanı veya yeni günlük AI özeti gerektirmiyor. Bugün içeriğinin sırası tasarım kararıdır. Screener, Decision Card, Portfolio Fit, transkript ve genel AI sohbeti bu teslimde çalışan özellik gibi görünmemeli; tartışılacaklarsa açıkça **GELECEK** etiketi taşımalı.

## Beş sayfanın somut yerleşimi

Masaüstünde 192 piksel görev menüsü ve 56 piksel üst şerit öneriyorum. Şeritte “Şirket veya sembol ara” araması baskın; mevcut portföy seçimi daha küçük bir kontrol. Şirket fiyatı küresel şeritte sürekli tekrar etmez. İçerik alanında yaklaşık 24 piksel kenar boşluğu yeterli. Mobilde aynı görevler alt gezinmeye iner; tablo kendi içinde kayar.

**Bugün:** Başlık yalnız “Bugün”. İlk satırda portföy seçimi, “Güncel değer”, “Maliyet” ve “Fiyat kapsamı”; ikinci satırda alanın üçte ikisinde performans, üçte birinde dağılım. Ardından “Pozisyonlar” tablosu ve “Haberler / Takvim” sekmeleri. Makro göstergeler kısa bağlam şeridi olur; boşsa yüksek bir panel kaplamaz. Portföy yokken bu alanın yerine tek “Portföy oluştur” eylemi gelir; “Varlık araştır” ikincil erişimi kalır.

**Araştır:** Başlıkta sembol, doğrulanmış ad/tür, para birimi ve son fiyat zamanı; sağda “İzlemeye ekle” ve mevcut raporlara erişim. Önerilen sekmeler “Genel bakış”, “Grafik”, “Finansallar”, “Risk”, “Haberler”, “AI raporu”. Bu, mevcut araçların yeni görsel gruplamasıdır; bugün tek workspace içinde uygulanmış sayılmaz. Genel bakışta grafik/metrik oranı yaklaşık 65/35; finansallarda tablo yüzde 100 genişlik alır. Kaynak ayrıntıları satırın yanından açılır, sürekli 258 piksel tüketmez. ETF’de şirket gelir tablosu yerine yalnız gerçekten desteklenen fon verisi veya açık kapsam açıklaması gösterilir.

Grafik araç sırası dönem, görünüm, göstergeler şeklinde olmalı. Mevcut 1D–1Y dönemleri, Mum/Çizgi/Alan/Heikin Ashi ve SMA20/SMA50 korunabilir. Ancak “1D” son bir barı gösteriyorsa gün içi fiyat izlenimi yaratmamalı; aralık ve gözlem sıklığı açıklanmalı. OHLC yoksa mum seçilememeli. Heikin Ashi dönüştürülmüş görünüm olarak etiketlenmeli. AI raporu kanıt sekmelerinden sonra gelir; mevcut rapor yoluna erişim korunur. Altı analistin sırası Temel, Teknik, Risk, Boğa, Ayı, Portföy Yöneticisi olarak görünür; API aşama ilerlemesi vermiyorsa sahte canlı ilerleme çizilmez.

**İzleme Listem:** Liste seçici ve “Sembol ekle” üstte; alanın tamamında sıralanabilir araştırma tablosu. Sembol, son fiyat, değişim, veri zamanı ve mevcut araştırma alanları gruplanır. İlk sütun sabit kalır. Sağda sürekli boş detay paneli yerine sembole basınca araştırma açılır.

**Portföy:** “Özet / Pozisyonlar / İşlemler” sekmeleri öneriyorum; mevcut işlem ekranının derin bağlantısı korunur. Özette performans/dağılım oranı 70/30, pozisyonlarda tam genişlik tablo. “İşlem ekle” kayıt eylemidir; alım emri düğmesi gibi sunulmaz. **Günlük:** Üstte “Kayıt ekle”, sembol ve tarih filtreleri; altta mevcut günlük kayıtları. Serbest araştırma notu mevcut kayıt şemasıyla doğrulanmadan çalışan kalıcı özellik diye tanıtılmaz; V3’ün oturum notu ürün günlüğünün yerine geçmez.

## Etiketler, durumlar ve mali doğruluk

Butonlar “İncele”, “Ayrıntı” gibi belirsiz ifadeler yerine “Kaynağı aç”, “Raporu aç”, “Yeniden dene” demeli. Yüklenirken yerleşim korunur ve “Fiyat geçmişi yükleniyor” yazılır. Boş listede “Henüz sembol eklenmedi”; sonuçsuz aramada “Eşleşme bulunamadı”; sağlayıcı hatasında “Fiyat kaynağına ulaşılamadı” farklı durumlardır. Kısmi araştırma, çalışan sekmeleri korur. Yetersiz geçmiş, hangi metriğin hesaplanamadığını söyler. Eski fiyatın zamanı görünür; genel yeşil “Güncel” rozeti kullanılmaz.

Eksik fiyat varsa toplam güncel değer bilinmiyor kalır. “Fiyatı bulunan pozisyonların ara toplamı” ve adet kapsamı ayrıca sunulur. Maliyet güncel değere dönüştürülmez; eksik getiri sıfır olmaz. Grafik aralığı değişince eksik noktalar hayalî çizgiyle doldurulmaz. Para birimi ve mali yıl, sayının yanında veya açık tablo başlığında yer alır.

## Diğer uzmanlara itirazlar ve tercihin kaybı

Görsel kimlik uzmanına sorum: Amber hem ana eylem hem eksik veri uyarısı olursa kullanıcı seçim ile veri sorununu nasıl ayıracak? Ben açık nötr yüzey, koyu metin ve kontrollü mavi seçimden yanayım; olumlu/olumsuz renkler yalnız finansal anlam taşımalı. Yoğunluğu navigasyonda rahat, tablolarda 36–40 piksel satır ritmi olarak öneriyorum.

Etkileşim uzmanına itirazım: Kaynak panelini sürekli açık tutmak, finansal sütunları kaydırmaya zorluyorsa kaynak görünürlüğü uğruna karşılaştırmayı bozuyoruz. Satırdan açılan panel yeterince bulunabilir nasıl olur? İkinci sorum, altı araştırma sekmesini dar ekranda hangi açık etiketlerle erişilebilir tutacağımızdır. İki uzmana ortak sorum: Büyük fiyat ve getiri başlıkları, fiyatı olmayan araştırma ekranında bütün hiyerarşiyi çökertiyor mu?

B seçeneğinin kaybını kabul ediyorum: Grafikle bilanço aynı anda sürekli görünmez; kullanıcı sekme değiştirir. Tam terminal arayan kişi daha az özelleştirme bulur. Buna karşılık araştırmanın esas yüzeyi genişler ve her bölümün veri durumu daha açık kalır. Son oylamada bu bedeli özellikle tartışmak istiyorum.
