# Veri Cekme Altyapisi Raporu

Bu rapor, mevcut kodda aktif olan veri cekme altyapisini ozetler. Kaynak olarak Spring backend controller/adaptor/scheduler katmani ile FastAPI data-service router/provider katmani esas alinmistir.

## Genel durum

Veri cekme altyapisi temel akislarda hazir durumdadir:

- Backend, frontend icin ana sozlesmeyi `/api/v1` altinda sunar.
- Fiyat gecmisi icin DB-first lazy load uygulanir: PostgreSQL kontrol edilir, eksik veya bayat veri varsa data-service veya Yahoo uzerinden veri cekilir, gelen barlar DB'ye yazilir.
- Data-service, piyasa verisinde provider chain kullanir: Yahoo birincil, Tiingo opsiyonel EOD fallback, Finnhub haber/analist/sentiment icin opsiyonel provider.
- Macro ve market calendar verileri data-service tarafinda Redis varsa Redis'te, yoksa bellek ici cache'te tutulur.
- Provider hatalarinda bos liste, `null` alan veya partial response ile degrade etme davranisi genel olarak mevcut.

Hazirlik notlari:

- Otomatik cekim yalnizca fiyat ingestion ve firsat radari icin var.
- Haber, analist, teknik analiz, macro, calendar, research ve agent-analysis akislari endpoint cagrildikca tetikleniyor.
- Spring cache TTL davranisi `RedisConfig.java` icindeki cache-adi bazli konfig ile yonetilir. Kritik cache adlari default TTL'e birakilmadan veri tipine gore ayrilmistir.

## Otomatik cekimler

| Veri | Tetikleyici | Backend akisi | Provider / servis | Frekans |
| --- | --- | --- | --- | --- |
| Gunluk OHLCV fiyat gecmisi | `PriceIngestionJob` | Tum kayitli asset'ler icin `PriceIngestionService.ingestAll()` | `YahooFinancePriceAdapter` -> Yahoo Chart API | Her gun `0 0 0 * * ?` cron, sunucu timezone'una gore gece 00:00 |
| Firsat radari / smart report bildirimi | `OpportunityRadarJob` | Tum asset'ler icin `SmartReportUseCase.getSmartReport(symbol)`, skor >= 80 ise notification | Smart report'un bagli oldugu fiyat, fundamental, research, Finnhub ve data-service akislari | Her gun `0 0 1 * * ?` cron, sunucu timezone'una gore gece 01:00 |

## Backend public endpointleri ve veri cekme davranisi

| Backend endpoint | Cekilen veri | Upstream / provider | Ne zaman cekiliyor? | Cache / persist |
| --- | --- | --- | --- | --- |
| `POST /api/v1/assets/batch` | Asset metadata ve ilk 1 yil gunluk OHLCV | Yahoo Chart API | Kullanici batch asset eklediginde | Asset DB'ye yazilir. Fiyatlar bos degilse `price_histories` tablosuna yazilir. |
| `GET /api/v1/prices/{symbol}/latest` | En son fiyat bar'i | DB, gerekirse `FinancialDataPort` provider chain (`1d/5d`) | Endpoint cache miss'te; servis DB'yi okur, provider'dan taze barlari alir ve en yeni gercek bari dondurur | Gelen fiyatlar DB'ye yazilir. `priceCache`, TTL 5 dk. |
| `GET /api/v1/prices/{symbol}/history?interval=&range=` | OHLCV gecmisi | DB, gerekirse `FinancialDataPort` provider chain | Endpoint cache miss'te; DB bos ise, `range=5d` ise, intraday interval ise veya son bar bugunden eskiyse refresh edilir | Gelen barlar DB'ye yazilir ve timestamp bazli merge edilir. `priceCache`, TTL 5 dk. |
| `GET /api/v1/technical/{symbol}?interval=&range=` | RSI, MACD, Bollinger, ATR, SMA, EMA | data-service `/api/v1/technical/{symbol}` -> yfinance | Cache miss'te endpoint cagrildikca | `technicalCache`, TTL 10 dk. 30 mumdan az veri varsa 422 doner. |
| `GET /api/v1/technical/{symbol}/signals?interval=&range=` | Teknik BUY/HOLD/SELL sinyali | data-service `/api/v1/technical/{symbol}/signals` -> yfinance | Cache miss'te endpoint cagrildikca | `technicalCache`, TTL 10 dk. 30 mumdan az veri varsa 422 doner. |
| `GET /api/v1/news/{symbol}` | Son 7 gun sirket haberleri | Finnhub `/company-news` | Cache miss'te endpoint cagrildikca | `newsCache`, TTL 30 dk. |
| `GET /api/v1/analyst/{symbol}/recommendations` | Analist tavsiye trendleri | Finnhub `/stock/recommendation` | Cache miss'te endpoint cagrildikca | `analystCache`, TTL 6 saat. |
| `GET /api/v1/analyst/{symbol}/price-target` | Analist hedef fiyatlari | Finnhub `/stock/price-target` | Cache miss'te endpoint cagrildikca | `analystCache`, TTL 6 saat. |
| `GET /api/v1/fundamentals/{symbol}` | Revenue, net income, EPS, FCF ve oranlar | data-service research + Yahoo/yfinance, ayrica persisted financial data port | `fundamentalCache` miss'te endpoint cagrildikca | `fundamentalCache`, TTL 24 saat. Provider hatasi partial/bos veriyle degrade eder. |
| `GET /api/v1/fundamentals/{symbol}/ratios` | PE, PB, debt/equity, current/quick ratio, ROE/ROA | Finnhub metrics + data-service fundamental | `fundamentalCache` miss'te endpoint cagrildikca | `fundamentalCache`, TTL 24 saat. |
| `GET /api/v1/fundamentals/{symbol}/earnings` | Kazanc gecmisi | data-service `/api/v1/research/earnings/{symbol}` | `fundamentalCache` miss'te endpoint cagrildikca | `fundamentalCache`, TTL 24 saat. |
| `GET /api/v1/fundamentals/{symbol}/insider` | Insider transactions | Finnhub `/stock/insider-transactions` | `insiderCache` miss'te endpoint cagrildikca | `insiderCache`, TTL 6 saat. |
| `GET /api/v1/fundamentals/{symbol}/institutional` | Piotroski, Altman, Beneish, quality skorlar | data-service `/api/v1/research/institutional-scores/{symbol}` | `fundamentalCache` miss'te endpoint cagrildikca | `fundamentalCache`, TTL 24 saat. |
| `GET /api/v1/reports/company/{symbol}` | Teknik analiz, analist tavsiyesi, hedef fiyat, son 7 gun haber | data-service technical + Finnhub | Endpoint cagrildikca | Bu composite endpointte controller cache yok; alt endpoint cache'leri burada dogrudan kullanilmiyor. |
| `GET /api/v1/reports/smart/{symbol}` | Composite smart report | Smart report use case; research, fiyat, Finnhub/data-service bagimliliklari | Endpoint cagrildikca veya OpportunityRadarJob ile gunluk | Controller seviyesinde cache yok. |
| `GET /api/v1/macro/snapshot` | Fed funds, CPI, CPI YoY, GDP growth, unemployment, 10Y/2Y yield, spread | data-service `/api/v1/macro/snapshot` -> FRED | Backend endpoint cagrildikca; data-service cache miss'te FRED'e gider | Data-service cache TTL 4 saat. Tum macro alanlari yoksa backend `503` doner. |
| `GET /api/v1/calendar` | Earnings + ekonomik takvim | data-service `/api/v1/calendar` -> FMP | Backend endpoint cagrildikca; data-service gunluk cache miss'te FMP'ye gider | Data-service cache gece yarisi UTC'ye kadar. |
| `GET /api/v1/calendar/earnings?symbols=` | Earnings calendar | data-service `/api/v1/calendar/earnings` -> FMP | Backend endpoint cagrildikca; data-service gunluk cache miss'te FMP'ye gider | Data-service cache gece yarisi UTC'ye kadar. |
| `GET /api/v1/calendar/economic-events` | Yuksek etkili ekonomik olaylar | data-service `/api/v1/calendar/economic-events` -> FMP | Backend endpoint cagrildikca; data-service gunluk cache miss'te FMP'ye gider | Data-service cache gece yarisi UTC'ye kadar. |
| `GET /api/v1/agent-analysis/{ticker}` | LLM agent analizi icin fiyat, fundamental, teknik, risk, sentiment ve macro metrikleri | DB + Yahoo/data-service + Finnhub + FRED + data-service `/api/v1/agent-analysis` | Redis agent cache miss'te endpoint cagrildikca | `agent-analysis:{ticker}` Redis TTL 15 dk; basarili sonuc history tablosuna yazilir. |
| `GET /api/v1/portfolio/summary`, `/allocation`, `/positions/enriched` | Portfoy piyasa degeri ve PnL | Persisted positions + `PriceRefreshService.getFreshLatest` | Dashboard okundukca; frontend market acikken 60 sn, kapaliyken 15 dk aralikla yeniler | Pozisyonlar DB'den okunur. Fiyatlar gercek provider verisiyle refresh edilir; provider yoksa avg cost fallback, fake veri yok. |
| `GET /api/v1/portfolio/performance?period=` | Portfoy performans serisi | Persisted positions + `PriceRefreshService.getFreshHistory` | Dashboard okundukca; secili periyoda gore `5d/1mo/3mo/6mo/1y/5y` range kullanilir | Fiyatlar DB'ye yazilir/merge edilir. Gercek fiyat yoksa seri bos doner. |
| `GET /api/v1/journal/trades`, `/stats` | Journal PnL ve istatistikleri | Persisted journal trades + acik trade latest fiyatlari | Journal okundukca acik islemler latest fiyatla zenginlestirilir | Closed trade fiyatlari read sirasinda degismez; open trade provider yoksa persisted currentPrice ile kalir. |

## Data-service endpointleri ve provider davranisi

| Data-service endpoint | Provider / kutuphane | Cekilen veri | Frekans / cache |
| --- | --- | --- | --- |
| `GET /api/v1/prices/{symbol}?interval=&range=` | `MarketDataResolver`: Yahoo -> Tiingo -> Finnhub | OHLCV barlari | Her backend lazy-load veya dogrudan cagri aninda. Data-service seviyesinde fiyat cache'i yok. Provider 3 ardil hata sonrasi 60 sn blacklist edilir; health monitor 30 sn aralikla tekrar dener. |
| `GET /api/v1/technical/{symbol}` | yfinance + pandas-ta | Teknik indikatorler | Her cagri aninda yfinance history ceker. En az 30 mum gerekir. |
| `GET /api/v1/technical/{symbol}/signals` | yfinance + pandas-ta | Teknik sinyal | Her cagri aninda yfinance history ceker. En az 30 mum gerekir. |
| `GET /api/v1/research/fundamental/{symbol}` | yfinance `.info`, `.financials`, `.balance_sheet`, `.cashflow` | Fundamental metrikler ve raw statement alanlari | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/valuation/{symbol}` | research servisleri | Valuation metrikleri | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/risk/{symbol}` | risk analytics servisleri | Risk metrikleri | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/earnings/{symbol}` | earnings analysis servisi | EPS/kazanc gecmisi | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/factors/{symbol}` | factor analysis servisi | Faktor skorlari | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/institutional-scores/{symbol}` | factor analysis servisi | Kurumsal kalite skor seti | Her cagri aninda. Cache yok. |
| `GET /api/v1/research/composite/{symbol}` | composite score servisi | Composite investment score | Her cagri aninda. Cache yok. |
| `GET /api/v1/sentiment/{symbol}` | Finnhub + sentiment service | Haber/sentiment | Her cagri aninda. `FINNHUB_API_KEY` yoksa `503`. |
| `GET /api/v1/full/{symbol}` | yfinance technical + Finnhub sentiment + opsiyonel Azure OpenAI insight | Full analiz | Her cagri aninda; alt servis hatalari partial sonucu bozmayacak sekilde izole edilir. |
| `GET /api/v1/patterns/{symbol}` | yfinance + pattern detection + opsiyonel Azure OpenAI | Grafik formasyonlari | Her cagri aninda. Cache yok. |
| `POST /api/v1/agent-analysis` | Azure OpenAI | Onceden hesaplanmis metriklerle ajan analizi | Backend agent cache miss'te cagrilir. Data-service seviyesinde cache yok. |
| `GET /api/v1/macro/snapshot` | FRED | Macro snapshot | Cache miss'te FRED'den paralel seri cekimi. Redis/bellek TTL 4 saat. |
| `GET /api/v1/calendar` | FMP | 30 gunluk earnings + high-impact economic events | Cache miss'te FMP'den bugunden itibaren 30 gunluk pencere. Cache gece yarisi UTC'ye kadar. |
| `GET /api/v1/calendar/earnings` | FMP | 30 gunluk earnings | Ortak calendar cache'inden filtrelenir; cache gece yarisi UTC'ye kadar. |
| `GET /api/v1/calendar/economic-events` | FMP | High-impact economic events | Ortak calendar cache'inden doner; cache gece yarisi UTC'ye kadar. |

## Harici provider endpointleri

| Provider | Kodda kullanilan endpoint / API | Kullanildigi veri |
| --- | --- | --- |
| Yahoo Finance Chart API | `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range}` | Backend dogrudan fiyat gecmisi, ilk asset price bootstrap, asset meta blok bilgisi |
| yfinance | `yf.Ticker(symbol).history(...)`, `.info`, `.financials`, `.balance_sheet`, `.cashflow`, `.news` | Data-service fiyat, teknik analiz, fundamental, asset info, Yahoo haberleri |
| Tiingo | `https://api.tiingo.com/tiingo/daily/{ticker}/prices` | OHLCV EOD fallback |
| Tiingo | `https://api.tiingo.com/tiingo/daily/{ticker}` | Basic asset info fallback |
| Finnhub | `https://finnhub.io/api/v1/company-news` | Sirket haberleri |
| Finnhub | `https://finnhub.io/api/v1/stock/recommendation` | Analist tavsiye trendleri ve agent sentiment |
| Finnhub | `https://finnhub.io/api/v1/stock/metric` | Sirket metrikleri |
| Finnhub | `https://finnhub.io/api/v1/stock/price-target` | Analist hedef fiyatlari |
| Finnhub | `https://finnhub.io/api/v1/stock/insider-transactions` | Insider transaction verisi |
| Finnhub | `https://finnhub.io/api/v1/stock/peers` | Benzer sirketler |
| FRED | `https://api.stlouisfed.org/fred/series/observations` | FEDFUNDS, CPIAUCSL, A191RL1Q225SBEA, UNRATE, DGS10, DGS2 |
| FMP | `https://financialmodelingprep.com/stable/earnings-calendar` | Earnings calendar |
| FMP | `https://financialmodelingprep.com/stable/economic-calendar` | Ekonomik takvim; kod high-impact keyword filtresi uygular |
| Azure OpenAI | Configured `AZURE_OPENAI_ENDPOINT` / deployment | Agent analysis, insight, decision support |

## Rate limit, cache ve degrade kurallari

- Finnhub backend client: Resilience4j ile 30 istek/sn rate limit, 3 retry, 10 cagri sliding-window circuit breaker, 10 concurrent bulkhead.
- Spring Redis cache TTL'leri cache adina gore ayrilir: `priceCache` 5 dk, `technicalCache` 10 dk, `newsCache` 30 dk, `analystCache` 6 saat, `insiderCache` 6 saat, `companyReportCache` 30 dk, `smartReportCache` 6 saat, `fundamentalCache` 24 saat, `researchCache` 12 saat, `assetsCache`/`assetCache` 24 saat.
- Agent analysis Redis cache TTL: 15 dk (`agent-analysis.cache-ttl-minutes`).
- Data-service macro cache TTL: 4 saat.
- Data-service FMP calendar cache: gece yarisi UTC'ye kadar, 30 gunluk sliding lookahead.
- Data-service MarketDataResolver: provider 3 ardil hard failure sonrasi 60 sn blacklist; 30 sn health monitor tekrar dener.
- Eksik provider key'leri:
  - `TIINGO_API_KEY` yoksa Tiingo fallback devre disi.
  - `FINNHUB_API_KEY` yoksa Finnhub data-service provider devre disi; backend Finnhub client bos/hatali cevaplari bos liste veya null ile degrade eder.
  - `FRED_API_KEY` yoksa macro alanlari null doner; backend tum alanlar null ise `503` doner.
  - `FMP_API_KEY` yoksa calendar endpointleri bos liste doner.
  - `AZURE_OPENAI_*` yoksa agent/insight endpointleri `503` veya backend tarafinda bos optional ile degrade eder.

## Kontrol edilmesi gereken noktalar

- Teknik analiz icin 30'dan az mumda data-service `422` dondurur; backend bu status kodunu frontend'e koruyarak iletir.
- `AnalystController` yorumundaki 6 saatlik cache beklentisi `analystCache` TTL konfigu ile uyumludur.
- Data-service fiyat endpointinde persistent cache yok; provider cagri sikligini backend `PriceRefreshService`, PostgreSQL lazy-load/persist ve `priceCache` azaltir.
- `OpportunityRadarJob` her gun tum asset'ler icin smart report uretirken alttaki provider cagri sayisi asset sayisiyla dogru orantili artar.
