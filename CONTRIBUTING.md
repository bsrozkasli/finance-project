# CONTRIBUTING.md

> Bu döküman, projeye katkıda bulunan her geliştirici ve yapay zeka aracının (AI Agent/Copilot) uyması gereken kuralları tanımlar. Kurallara uymayan Pull Request'ler otomatik reddedilir.

---

## İçindekiler

1. [Genel İlkeler](#1-genel-ilkeler)
2. [Mimari Kurallar](#2-mimari-kurallar)
3. [Kod Standartları](#3-kod-standartları)
4. [Test Stratejisi](#4-test-stratejisi)
5. [Smoke Test Protokolü](#5-smoke-test-protokolü)
6. [AI Agent Kuralları](#6-ai-agent-kuralları)
7. [Git Workflow](#7-git-workflow)
8. [Pull Request Checklist](#8-pull-request-checklist)

---

## 1. Genel İlkeler

- **Finansal veri doğruluğu en önce gelir.** Görsel iyileştirme veya performans optimizasyonu, veri bütünlüğünden asla önce olamaz.
- Her değişiklik **tek sorumluluk (Single Responsibility)** ilkesine uygun olmalıdır. Bir PR hem API değişikliği hem DB migrasyonu içeremez.
- Kod tabanına girecek her şey **test edilebilir** olmalıdır. Test yazılamayan kod kabul edilmez.
- Secrets (API anahtarı, şifre, token) hiçbir zaman kaynak koduna girmez. `.env` veya Vault kullanılır.

---

## 2. Mimari Kurallar

Bu proje **Hexagonal (Ports & Adapters) Architecture** kullanmaktadır. Aşağıdaki katman sınırları ihlal edilemez.

```
domain/          ← Saf iş mantığı. Hiçbir framework import'u yasak.
├── model/       ← Stock, Price, Watchlist entity'leri
├── port/        ← Inbound ve Outbound port interface'leri
└── service/     ← Domain servisleri (use case implementasyonları)

adapter/
├── inbound/
│   └── rest/    ← Spring @RestController'lar buraya girer
├── outbound/
│   ├── persistence/  ← JPA Repository implementasyonları
│   └── client/       ← FMP / Alpha Vantage OpenFeign client'ları
```

### Katman Kuralları

| Kural | Açıklama |
|-------|----------|
| **domain → dışarıya bağımlılık yasak** | `domain/` içinde `@Repository`, `@Component`, `javax.*`, `spring.*` import'u olamaz |
| **Adapter → sadece port üzerinden konuşur** | Adapter sınıfları birbirini doğrudan çağıramaz |
| **Controller → Service'i çağırır, Repository'i çağırmaz** | Controller içinde `@Autowired XxxRepository` yasak |
| **DTO ↔ Domain dönüşümü adapter katmanında olur** | Domain model'i hiçbir zaman HTTP response olarak dışarı çıkmaz |

---

## 3. Kod Standartları

### Java (Backend)

- Java 17+ kullanılır. `var` keyword'ü okunabilirliği artırdığı yerlerde teşvik edilir.
- Tüm `public` metotlar **JavaDoc** ile belgelenmelidir.
- `null` dönüş değeri yasaktır; bunun yerine `Optional<T>` kullanılır.
- Finansal hesaplamalarda `double` veya `float` **kesinlikle yasak**; `BigDecimal` zorunludur.
- `@Scheduled` metotlarının body'si boş olmamalı; içinde iş mantığı değil, sadece servis çağrısı olmalıdır.

```java
// ❌ YANLIŞ
@Scheduled(fixedRate = 300000)
public void fetchPrices() {
    List<String> symbols = List.of("AAPL", "THYAO");
    symbols.forEach(s -> {
        // 50 satır iş mantığı...
    });
}

// ✅ DOĞRU
@Scheduled(fixedRate = 300000)
public void fetchPrices() {
    priceIngestionService.ingestAll();
}
```

- Rate limiting için `Resilience4j @RateLimiter` kullanılır. FMP/Alpha Vantage çağrıları annotation ile korunmalıdır.

```java
@RateLimiter(name = "fmpApi")
public PriceData fetchQuote(String symbol) { ... }
```

### React (Frontend)

- TypeScript zorunludur. `any` tipi yasaktır.
- Component dosyası 200 satırı geçiyorsa alt component'lere bölünmelidir.
- API çağrıları doğrudan component içinde yapılamaz; `hooks/` altındaki custom hook'lar üzerinden yapılır.
- `lightweight-charts` veri formatı her zaman `{ time: string, value: number }` şeklinde tip güvenceli olmalıdır.
- Finansal sayılar `Intl.NumberFormat` ile formatlanmalıdır; manuel string birleştirme yasaktır.

```typescript
// ❌ YANLIŞ
const price = data.price + " USD";

// ✅ DOĞRU
const price = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD'
}).format(data.price);
```

---

## 4. Test Stratejisi

Bu proje **Testing Pyramid** modelini benimser:

```
        /\
       /  \   E2E Tests (az, pahalı)
      /----\
     /      \  Integration Tests (orta)
    /--------\
   /          \ Unit Tests (çok, hızlı)
  /____________\
```

### 4.1 Unit Test Kuralları

**Framework:** JUnit 5 + Mockito (Backend) | Jest + React Testing Library (Frontend)

- Her `domain/service/` sınıfı için birebir bir test sınıfı olmalıdır.
- Test metot isimlendirmesi: `should_[beklenenSonuç]_when_[koşul]`

```java
@Test
void should_calculateDailyChangePercentage_when_previousClosePriceIsPositive() {
    // Arrange
    Price previous = Price.of(BigDecimal.valueOf(100.00));
    Price current  = Price.of(BigDecimal.valueOf(105.00));

    // Act
    BigDecimal change = priceCalculator.dailyChangePercent(previous, current);

    // Assert
    assertThat(change).isEqualByComparingTo(BigDecimal.valueOf(5.00));
}
```

- **Finansal hesaplama metotları için minimum %100 branch coverage** zorunludur.
- Dış bağımlılıklar (API client, DB) her zaman mock'lanır; gerçek HTTP isteği atılmaz.
- Test sınıfları production kodundan **bağımsız** olmalıdır: `@SpringBootTest` unit testlerde yasak, context yüklenmemelidir.

### 4.2 Integration Test Kuralları

**Framework:** `@SpringBootTest` + Testcontainers (PostgreSQL, Redis)

- Her Outbound Adapter için bir integration testi yazılır.
- Testcontainers kullanılır; gerçek veritabanı veya gerçek API'ye bağlanılmaz.
- `@Sql` annotation'ı ile test verisi her test öncesi temizlenir.

```java
@Testcontainers
@SpringBootTest
class PriceRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void should_persistPrice_when_validAssetExists() { ... }
}
```

- WireMock ile FMP API stub'ları hazırlanır; gerçek API anahtarı test ortamına girmez.

### 4.3 Frontend Unit Test Kuralları

- Her custom hook için Jest testi zorunludur.
- `lightweight-charts` bileşenleri mock'lanır; DOM render testi yapılmaz.
- Finansal format fonksiyonları (currency, percentage) sıfır, negatif ve çok büyük sayılarla test edilir.

```typescript
describe('formatCurrency', () => {
  it('should format zero correctly', () => { ... });
  it('should format negative price correctly', () => { ... });
  it('should handle very large numbers', () => { ... });
});
```

---

## 5. Smoke Test Protokolü

Smoke test'ler her deployment sonrası otomatik çalışır ve sistemin **ayakta olduğunu** doğrular. Kapsamlı test değildir; kritik yolları hızlıca kontrol eder.

### Backend Smoke Test Listesi

Aşağıdaki endpoint'ler `200 OK` dönmelidir (response body doğrulanmaz):

```
GET  /actuator/health          → { "status": "UP" }
GET  /api/v1/assets/summary    → HTTP 200, body boş olabilir
GET  /api/v1/assets/AAPL/history?period=1D  → HTTP 200
```

Test komutu:
```bash
./gradlew smokeTest -Penv=staging
```

Smoke test class'ı `src/test/java/.../smoke/` altında yer alır ve CI pipeline'ında `integrationTest` task'ından **ayrı** bir aşamada çalışır.

### Frontend Smoke Test Listesi

```bash
# Dashboard açılabilmeli
curl -s http://localhost:3000 | grep -q "Stock Dashboard"

# API bağlantısı çalışıyor olmalı (network tab)
# window.smokeTest() fonksiyonu her ortamda expose edilir
```

### Smoke Test Başarısızlık Protokolü

1. Pipeline durdurulur, deployment rollback yapılır.
2. Oncall engineer'a PagerDuty/Slack bildirimi gönderilir.
3. Smoke test başarısız olan bir sürüm **production'a hiçbir koşulda geçemez**.

---

## 6. AI Agent Kuralları

Bu bölüm GitHub Copilot, Cursor, Claude Code veya benzeri yapay zeka araçlarının uyması gereken özel kurallardır.

### Kesinlikle Yasak Olan Eylemler

```
❌ Domain katmanına framework annotation'ı ekleme (@Entity, @Component vb.)
❌ BigDecimal yerine double/float kullanarak finansal hesaplama yapma
❌ Hardcoded API anahtarı veya şifre ekleme
❌ Test yazmadan production kodu ekleme
❌ Mevcut bir port interface'ini, tüm adapter'ları güncellemeden değiştirme
❌ @Scheduled metot içine doğrudan iş mantığı yazma
❌ Frontend'de TypeScript'i `any` ile bypass etme
❌ Testcontainers yerine gerçek veritabanına bağlanan test yazma
```

### AI Agent İçin Zorunlu Adımlar

Bir özellik eklemeden önce AI agent aşağıdaki soruları yanıtlamalıdır:

1. **Hangi katmana ait?** (domain / inbound adapter / outbound adapter)
2. **Mevcut port var mı?** Varsa extend et, yoksa önce port interface'i yaz.
3. **Finansal veri içeriyor mu?** → BigDecimal kullan.
4. **Dış servis çağrısı var mı?** → Rate limiter ve circuit breaker ekle.
5. **Test nasıl yazılacak?** → Önce test yaz (TDD tercih edilir).

### Kod Üretiminde Öncelik Sırası

```
1. Önce domain model ve port interface'i
2. Sonra unit testler
3. Sonra implementasyon
4. Son olarak adapter ve controller
```

### Commit Mesajı Formatı (AI dahil herkes)

```
<type>(<scope>): <kısa açıklama>

[isteğe bağlı gövde]
[isteğe bağlı footer: closes #issue]
```

| Type | Kullanım |
|------|----------|
| `feat` | Yeni özellik |
| `fix` | Hata düzeltme |
| `test` | Sadece test ekleme/düzenleme |
| `refactor` | Davranış değiştirmeyen kod düzenlemesi |
| `chore` | Build, CI/CD, dependency güncelleme |
| `docs` | Döküman güncelleme |

Örnekler:
```
feat(price): add daily change percentage calculation in domain service
test(price): add unit tests for negative price edge cases
fix(fmp-client): handle rate limit 429 response with exponential backoff
```

---

## 7. Git Workflow

```
main          ← production; doğrudan push yasak
  └── develop ← entegrasyon branch'i
        ├── feature/faz1-price-history-api
        ├── feature/faz1-lightweight-charts-integration
        └── fix/fmp-rate-limit-handling
```

- `main` ve `develop` branch'lerine **doğrudan push yasaktır**; PR zorunludur.
- Feature branch'leri `feature/`, fix branch'leri `fix/` prefix'i alır.
- Bir PR en fazla **400 satır diff** içermelidir; büyük değişiklikler parçalanmalıdır.
- Merge öncesi tüm CI aşamaları (lint → unit test → integration test → smoke test) yeşil olmalıdır.

---

## 8. Pull Request Checklist

PR açmadan önce aşağıdaki her maddeyi kontrol et:

### Zorunlu (Tümü işaretli olmadan PR açılamaz)

- [ ] Eklenen her public metot için unit test yazıldı
- [ ] Finansal hesaplamalarda `BigDecimal` kullanıldı
- [ ] Domain katmanına framework import'u eklenmedi
- [ ] Yeni environment variable'lar `.env.example`'a eklendi (değersiz)
- [ ] Tüm testler local'de yeşil: `./gradlew test`
- [ ] Frontend TypeScript hataları sıfır: `npm run type-check`
- [ ] Commit mesajları conventional format'a uygun
- [ ] Değiştirilen port interface'leri varsa tüm adapter'lar güncellendi

### Önerilen

- [ ] Integration test yazıldı (yeni adapter ekleniyorsa zorunlu)
- [ ] Yeni endpoint için Swagger/OpenAPI annotation'ı eklendi
- [ ] README veya ilgili dokümantasyon güncellendi
- [ ] Performansa etkisi düşünüldü (N+1 query, gereksiz API çağrısı vb.)

---

> Son güncelleme: Faz 1 başlangıcı
> Bu döküman proje büyüdükçe güncellenmelidir. Değişiklik önerileri için `docs/` branch'inden PR açınız.
