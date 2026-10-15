# Plan 1 Execution Report — C0a Explicit Section Availability

**Branch:** `feat/local-model-phase-1`
**Completed:** 2026-10-15
**Commit range:** `39ac28e`–`8b32875`
**Suite result:** 161 passed, 1 xfailed (baseline 128; net +33 tests)

---

## Amaç

Spec §5 P1.1 (C0a): data-service'in 4 "fabrication site" (üretilen sayı / karar içeren) endpoint'ine makine tarafından okunabilir availability durumu eklemek. Mevcut hiçbir alan tipi veya değeri değişmez; Spring adapter'ları beklendiği gibi yeni alanları sessizce yok sayar.

---

## Ne Yapıldı

### Task 1 — `SectionAvailability` değer nesnesi

**Dosya:** `data-service/app/models/availability.py` (yeni)

Dört durum için pydantic v2 frozen model:
- `available` → `unavailable_reason: null`
- `unavailable(reason)` / `insufficient(reason)` / `unparseable(reason)` → `reason` snake_case zorunlu, `^[a-z][a-z0-9_]{0,63}$`

Provider API token'larının (`token=...` gibi) reason alanına sızmaması için format kuralı kilitlendi.

**Test:** `tests/test_section_availability.py` — 9 test (invariant, immutability, format validation)

**Commit:** `39ac28e feat(data-service): add explicit section availability value object`

---

### Task 2 — Sentiment availability

**Dosyalar:** `app/models/analysis.py`, `app/services/sentiment_service.py` (değiştirildi)

`SentimentAnalysisResponse`'a `availability: SectionAvailability` eklendi (required):
- Makale yoksa → `insufficient("no_articles_in_lookback")`
- LLM JSON değilse → `unparseable("llm_response_not_json")`
- `score` float değilse → `unparseable("llm_response_invalid_score")`
- `score`/`label` yoksa → `unparseable("llm_response_missing_fields")`
- Tam çıktı → `available()`

**Test:** `tests/test_sentiment_service_availability.py` — 6 test + route serialization testi

**Commit:** `3ac8f4a feat(data-service): report explicit sentiment availability`

---

### Task 3 — Enhanced sentiment availability

**Dosyalar:** `app/models/sentiment.py`, `app/services/enhanced_sentiment_service.py` (değiştirildi)

`EnhancedSentimentResponse`'a 4 alan eklendi:
- `news_availability`, `analyst_availability`, `insider_availability: SectionAvailability`
- `unavailable_components: list[str]`

Her sub-source kendi availability'sini hesaplar:
- `_fetch_news_sentiment`: SentimentService başarısızsa `unavailable("news_sentiment_failed")`
- `_fetch_analyst_data`: boş liste → `insufficient`, sıfır oy → `insufficient`, exception → `unavailable`
- `_fetch_insider_data`: boş → `insufficient`, exception → `unavailable`, başarı → `available`

**Test:** `tests/test_enhanced_sentiment_availability.py` — 7 test (Finnhub token sızıntısı testi dahil)

**Commit:** `1a30f57 feat(data-service): report enhanced sentiment availability per section`

---

### Task 4 — Composite score availability

**Dosyalar:** `app/models/composite.py`, `app/services/composite_score_service.py` (değiştirildi)

`CompositeInvestmentScore`'a eklendi:
- `breakdown_availability: dict[str, SectionAvailability]` — her breakdown alanı için
- `unavailable_components: list[str]`

**Planning Finding 1 (PF-1) keşfedildi ve görünür kılındı:**
`composite_score_service.py` `factor_res.quality_score` gibi üst-seviye nitelikleri okurken gerçek `FactorAnalysisResponse` bunları `.scores.quality_score` altında tutar. Bu yüzden üretimde 8 breakdown alanından 7'si her zaman nötr 50'dir. C0a bu eksikliği **düzeltmez** ama `factor_score_not_mapped` / `earnings_score_not_mapped` / `valuation_grade_not_mapped` reason kodlarıyla **görünür kılar**.

**Test:** `tests/test_composite_score_availability.py` — 6 test

**Commit:** `5aee398 feat(data-service): expose composite breakdown availability`

---

### Task 5 — Agent decision availability

**Dosyalar:** `app/agents/portfolio_manager.py`, `app/models/agent_analysis.py`, `app/trading_agents/metrics_trading_graph.py` (değiştirildi)

`PortfolioManagerVerdict` frozen dataclass eklendi. `run_portfolio_manager_verdict()` fonksiyonu yeni API:
- JSON + geçerli decision+confidence → `available()`
- JSON + geçersiz decision → `unparseable("pm_json_missing_or_invalid_fields")`
- Keyword fallback (BUY/SELL metni) → `unparseable("pm_response_not_json_keyword_fallback")`
- Default HOLD → `unparseable("pm_response_not_json_default_hold")`

`run_portfolio_manager()` geriye dönük uyumluluk için 4-tuple olarak korundu.
`AgentAnalysisResponse`'a `decision_availability: SectionAvailability` eklendi.

**Test:** `tests/test_agents.py` (+5 yeni), `test_agent_analysis_endpoint.py` (güncellendi), `test_metrics_trading_graph.py` (güncellendi)

**Commit:** `4f299ca feat(data-service): mark keyword-parsed agent decisions unparseable`

---

### Task 6 — Spring adapter uyumluluk testleri

**Dosya:** `backend/src/test/java/…/DataServiceC0aCompatibilityTest.java` (yeni)

4 test, her adapter için yeni availability alanları içeren JSON'ın Spring tarafından sessizce yok sayıldığını kanıtlar:
1. `agentAnalysisIgnoresDecisionAvailability` — `decision="SELL"`, `confidence=70`
2. `compositeIgnoresBreakdownAvailability` — `overallScore=51`, `recommendation="Reduce"`
3. `sentimentIgnoresAvailability` — `score=0.0`
4. `fullAnalysisIgnoresNestedSentimentAvailability` — `sentiment.label="NEUTRAL"`

Mekanizma: `new RestTemplate()` varsayılan olarak Jackson `FAIL_ON_UNKNOWN_PROPERTIES=false` kullanır.

**Sonuç:** 4/4 pass — `mvnw test -Dtest=DataServiceC0aCompatibilityTest`

**Commit:** `6e69d8b test(backend): prove data-service adapters tolerate availability fields`

---

### Task 7 — Dokümantasyon

**`docs/spec/current-system/contracts.md`** — "C0a availability fields" alt bölümü eklendi:
- `SectionAvailability` wire şekli ve format kuralları
- 4 response body'de hangi yeni alanların olduğu tablosu
- PF-1 notu (composite score yol uyumsuzluğu)

**`docs/product/evidence/c0b-compatibility-matrix.md`** (yeni):
- 4 adapter için consumer matrisi ve kanıt referansı
- PF-1 açıklaması ve düzeltme nereye ertelendi
- C0b kapsam önerisi

**Commit:** `8b32875 docs(spec): document C0a availability fields and C0b matrix`

---

## Kural Kararları (Rulings)

1. **Precondition 1 (hardening main'de birleşik değil):** Tüm hardening kodu çalışma ağacında mevcut olduğundan teknik bir bağımlılık değil, idari bir sıralama kısıtlaması. `feat/local-model-phase-1` üzerinde devam edildi. Risk: branch, önceki dal birleştirildiğinde rebase gerektirebilir.

2. **PF-1 düzeltilmedi:** Spec §8 "existing values unchanged" kuralı gereği C0a mevcut değerleri değiştiremez. PF-1 reason kodlarıyla görünür kılındı, düzeltme C0b veya sonraki bakım penceresine ertelendi.

---

## Test Özeti

| Kapsam | Yeni testler | Sonuç |
|---|---|---|
| `SectionAvailability` (Task 1) | 9 | 9/9 pass |
| Sentiment availability (Task 2) | 6 | 6/6 pass |
| Enhanced sentiment (Task 3) | 7 | 7/7 pass |
| Composite score (Task 4) | 6 | 6/6 pass |
| Agent decision (Task 5) | 5 + 2 güncellenmiş | suite 161 pass, 1 xfail |
| Spring compat (Task 6) | 4 (Java) | 4/4 pass |
| **Toplam Python** | **+33** | **161 pass, 1 xfail** |
| **Toplam Java** | **+4** | **4/4 pass** |

---

## Sonraki Adımlar

- **D-6 kararı:** PF-1'i C0b olarak düzeltmek mi yoksa ayrı `fix(data-service)` commit'i mi? (breakdown, overall_score, grade, recommendation değerleri değişir; tipler değişmez)
- **Plan 2:** `ml/` foundation + ADR-0007 (local model lifecycle)
- **C0b ön koşulu:** Spring `AgentAnalysisResponseDto` ve `CompositeInvestmentScoreDto`'ya availability alanları eklemek isteniyorsa ayrıca kararlaştırılmalı
