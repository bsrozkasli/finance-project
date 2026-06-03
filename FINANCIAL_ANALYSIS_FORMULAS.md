# Finansal Analiz ve Optimizasyon Formülleri

Bu proje, temel fiyat verilerinden anlamlı yatırım ve risk analizleri üretebilmek için geniş çaplı finansal formüller ve istatistiksel modeller kullanmaktadır. Aşağıda projede kullanılan başlıca metriklerin, algoritmaların formülleri, hesaplanma mantıkları ve kullanım amaçları detaylandırılmıştır.

---

## 1. Teknik Göstergeler (Technical Indicators)

Bu göstergeler `data-service/app/services/technical_analysis_service.py` içerisinde `pandas-ta` kütüphanesi yardımıyla hesaplanmaktadır. Fiyatın momentumunu, trendini ve volatilitesini ölçmek için kullanılırlar.

### 1.1. RSI (Relative Strength Index - Göreceli Güç Endeksi)
*   **Amaç:** Bir varlığın aşırı alım (overbought) veya aşırı satım (oversold) bölgesinde olup olmadığını belirleyen bir momentum osilatörüdür.
*   **Formül:** 
    $$ RSI = 100 - \left( \frac{100}{1 + RS} \right) $$
    $$ RS = \frac{\text{14 Günlük Ortalama Kazanç}}{\text{14 Günlük Ortalama Kayıp}} $$
*   **Kullanım:** Projede varsayılan periyot 14 gün olarak alınır. RSI değeri 70'in üzerindeyse "Aşırı Alım" (Overbought), 30'un altındaysa "Aşırı Satım" (Oversold) sinyali üretir.

### 1.2. MACD (Moving Average Convergence Divergence)
*   **Amaç:** İki farklı hareketli ortalama arasındaki ilişkiyi gösteren trend takip eden bir momentum göstergesidir. Trendin yönünü ve gücünü tespit etmek için kullanılır.
*   **Formül:**
    $$ \text{MACD Çizgisi} = \text{12 Günlük EMA} - \text{26 Günlük EMA} $$
    $$ \text{Sinyal Çizgisi} = \text{MACD Çizgisinin 9 Günlük EMA'sı} $$
    $$ \text{Histogram} = \text{MACD Çizgisi} - \text{Sinyal Çizgisi} $$
*   **Kullanım:** MACD çizgisi, sinyal çizgisini yukarı yönlü kestiğinde "Bullish (Yükseliş)", aşağı yönlü kestiğinde "Bearish (Düşüş)" sinyali olarak analiz servislerinde işlenir.

### 1.3. Bollinger Bantları (Bollinger Bands)
*   **Amaç:** Fiyatın volatilitesini ölçmek ve fiyatın ortalamadan ne kadar saptığını (aşırı fiyatlanmayı) bulmak için kullanılır.
*   **Formül:**
    $$ \text{Orta Bant (BBM)} = \text{20 Günlük SMA} $$
    $$ \text{Üst Bant (BBU)} = \text{20 Günlük SMA} + (2 \times \text{20 Günlük Standart Sapma}) $$
    $$ \text{Alt Bant (BBL)} = \text{20 Günlük SMA} - (2 \times \text{20 Günlük Standart Sapma}) $$
*   **Kullanım:** Fiyatın üst banda yaklaşması veya aşması varlığın pahalı, alt banda yaklaşması ise ucuz olduğunu işaret edebilir. Ayrıca projede fiyatın bant içindeki konumu yüzdelik olarak (Bollinger Position) hesaplanıp LLM'e verilir.

### 1.4. ATR (Average True Range - Ortalama Gerçek Aralık)
*   **Amaç:** Piyasa volatilitesinin mutlak bir ölçüsünü verir. Yön göstermez, sadece fiyatın ne kadar dalgalandığını (risk miktarını) gösterir.
*   **Formül:**
    $$ TR = \max(\text{High} - \text{Low}, |\text{High} - \text{Önceki Close}|, |\text{Low} - \text{Önceki Close}|) $$
    $$ ATR = \text{TR'nin 14 Günlük Hareketli Ortalaması} $$
*   **Kullanım:** Opsiyon stratejilerinde, stop-loss seviyelerinin belirlenmesinde ve LLM karar destek mekanizmasında varlığın tarihsel volatilitesine kıyasla şu anki durumu (percentile) bağlamında kullanılır.

---

## 2. Portföy Optimizasyonu ve Risk Metrikleri

Bu formüller `data-service/app/services/portfolio_service.py` içerisinde Modern Portföy Teorisi (Markowitz) baz alınarak, `pypfopt` (PyPortfolioOpt) kütüphanesi ve NumPy aracılığıyla hesaplanmaktadır.

### 2.1. Beklenen Getiri (Expected Return)
*   **Amaç:** Bir varlığın geçmiş fiyat hareketlerine dayanarak gelecekteki olası getirisini (yıllıklandırılmış) tahmin eder.
*   **Formül:** Tarihsel fiyatların geometrik veya aritmetik ortalaması (Mean Historical Return) kullanılarak günlük getiriler 252 (işlem günü) ile çarpılıp yıllıklandırılır.

### 2.2. Portföy Volatilitesi (Risk)
*   **Amaç:** Portföyün toplam riskini (standart sapmasını) ölçer. Varlıklar arasındaki korelasyonlar bu hesaba dahil edilir.
*   **Formül:**
    $$ \sigma_p = \sqrt{ w^T \Sigma w } $$
    *(w: Varlıkların ağırlık vektörü, Σ (Sigma): Varlıkların Kovaryans Matrisi)*
*   **Kullanım:** Projede kovaryans matrisini hesaplamak için "Ledoit-Wolf Shrinkage" yöntemi kullanılır. Bu yöntem, örneklem kovaryans matrisindeki aşırı sapmaları (noise) gidererek daha stabil bir risk ölçümü sağlar.

### 2.3. Sharpe Oranı (Sharpe Ratio)
*   **Amaç:** Alınan her bir birim riske karşılık ne kadar ekstra getiri sağlandığını gösterir (Risksiz getiri oranına göre).
*   **Formül:**
    $$ \text{Sharpe} = \frac{R_p - R_f}{\sigma_p} $$
    *(Rp: Portföy Beklenen Getirisi, Rf: Risksiz Getiri Oranı, σp: Portföy Volatilitesi)*
*   **Kullanım:** Projedeki "MAX_SHARPE" optimizasyon hedefi, bu oranı maksimize eden ağırlıkları (w) bulmaya çalışır.

### 2.4. Maksimum Düşüş (Max Drawdown)
*   **Amaç:** Varlığın veya portföyün tarihi zirvesinden yaşadığı en büyük oransal düşüşü ifade eder. En kötü senaryodaki kayıp riskini gösterir.
*   **Formül:**
    $$ \text{Drawdown}_t = \frac{\text{Fiyat}_t - \text{Maksimum Fiyat}_{0 \to t}}{\text{Maksimum Fiyat}_{0 \to t}} $$
    $$ \text{Max Drawdown} = |\min(\text{Drawdown})| $$
*   **Kullanım:** Portföy stres testlerinde ve risk değerlendirme raporlarında (LLM Insight) bir varlığın taşıdığı kuyruk riskini (tail risk) anlamak için kullanılır.

---

## 3. Klasik Fiyat Formasyonları (Pattern Detection)

`PatternDetectionService` algoritması, sadece göstergelere değil, aynı zamanda fiyatın oluşturduğu tepe/dip geometrik şekillerine de odaklanır. SciPy kütüphanesinin `find_peaks` fonksiyonu ile geliştirilmiştir.

### 3.1. İkili Tepe ve İkili Dip (Double Top / Double Bottom)
*   **Amaç:** Trend dönüş sinyallerini tespit etmektir.
*   **Mantığı:** `find_peaks` ile fiyatların (High) belirli bir mesafe ve yükseklik (prominence) ile ulaştığı yerel maksimumlar bulunur. İki tepenin/dibin birbirine yüksekliğinin %2'lik bir sapma içinde olup olmadığına bakılır.

### 3.2. Omuz-Baş-Omuz (Head and Shoulders / Inverse)
*   **Amaç:** Yükseliş veya düşüş trendinin sonlandığını işaret eden daha karmaşık bir dönüş formasyonudur.
*   **Mantığı:** Ardışık üç tepe tespit edilir. Ortadaki tepenin (Baş), sağ ve sol tepelerden (Omuzlar) daha yüksek (veya Inverse için daha düşük) olması zorunluluğu aranır. Omuzların simetrisine göre bir `confidence` (güven skoru) hesaplanır.

### 3.3. Hareketli Ortalama Kesişimleri (Golden Cross & Death Cross)
*   **Mantığı:**
    *   **Golden Cross:** 20 Günlük SMA'nın, 50 Günlük SMA'yı yukarı yönlü kesmesi (Bullish trend başlangıcı).
    *   **Death Cross:** 20 Günlük SMA'nın, 50 Günlük SMA'yı aşağı yönlü kesmesi (Bearish trend başlangıcı).
*   **Kullanım:** Daha uzun vadeli trend değişikliklerini yakalayarak AI analizlerine yapısal (structural) trend sinyalleri sağlamaktır.

---

## 4. LLM Karar Destek Karışımı (AI Synthesis)

Tüm bu veriler, sadece ham matematiksel çıktılar olarak kalmaz; *Azure OpenAI* tabanlı bir sistem kullanılarak (LLM Insight Service) birleştirilir. Sistem şu mantıkla çalışır:

1.  **Fiyat Aksiyonu:** Son 1 Gün, 1 Hafta, 1 Ay değişimleri ve 52 Haftalık Zirveye olan uzaklık (% olarak formülize edilir: `(Güncel / Zirve - 1) * 100`).
2.  **Sinyal Birleştirme:** Teknik Analiz verileri (Aşırı alım/satım, trend yönü), Formasyonlar ve Sentimental (Haber başlıkları, Finnhub duyarlılık skorları) tek bir bağlama oturtulur.
3.  **Portföy Bağlamı:** Eğer varlık portföyde bulunuyorsa, hedeflenen ağırlıktan (`target_weight`) ne kadar saptığı hesaplanır (`deviation`).
4.  **Çıktı:** Formüllerin ürettiği veriler üzerinden "Executive Summary", "Conviction Level", "Bull/Bear Case" ve "Risk/Reward" gibi analitik metrikler üretilir.

Bu hibrit yapı (Kantitatif Veri + YZ Yorumu), yatırımcının sadece rakamlara değil, bu rakamların o günkü piyasa koşullarında (haberler, sentiment) ne anlama geldiğine dair eyleme dönüştürülebilir bir Karar Destek Raporu (Decision Support Report) almasını sağlar.
