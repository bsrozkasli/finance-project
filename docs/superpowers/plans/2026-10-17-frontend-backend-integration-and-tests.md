# Frontend ↔ Backend Bağlantısı ve Entegrasyon Testleri Uygulama Planı

**Durum:** Tamamlandı — PR #44 ile `main`e girdi (2026-10-18). Task 1 taban çizgisi commit üretmez; Task 2 `d9e40e2`; Task 3 `ecef684`; Task 4 `bb206e8`; Task 5 `55639b8`, `82152d8`, `c9e07ff`, `7f5b25d`; Task 6 `8d70974`, `8293137`, `9917625`, `1c74a31`, `8c1326d`. Kanıt: `main` `c38a53f` üzerinde GitHub Actions `ci` run 39128666296, `frontend-integrated-e2e` dahil tüm job'lar başarılı. Adım kutucukları yürütme sırasında işaretlenmedi.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React frontend ile Spring backend arasındaki bağlantıyı yapılandırılabilir ve hata-şeffaf hâle getirmek; iki taraf arasındaki HTTP sözleşmesini ortak fixture'larla her iki test paketinde sabitlemek; redesign sonrası kırılan entegre E2E testlerini onarıp CI'da çalıştırmak.

**Architecture:** Frontend tek `apiClient` (axios) üzerinden Spring `/api/v1` API'sine gider; data-service'e doğrudan bağlanmaz. Base URL `src/api/config.ts`'ten gelir, axios response interceptor'ı backend'in beş alanlı hata gövdesini `ApiError`'a çevirir, böylece mevcut `err instanceof Error ? err.message : ...` tüketicileri kod değişmeden backend mesajını gösterir. `docs/contracts/fixtures/*.json` dosyaları hem backend `@WebMvcTest` (serileştirilmiş alan şekli) hem frontend Vitest (strict zod şeması) tarafından okunur; bir taraftaki alan değişikliği diğer tarafın build'ini kırar.

**Tech Stack:** Spring Boot 3.4.5 / Java 17 / JUnit 5 / MockMvc / Jackson 2 · React 19 / TypeScript 6 / axios 1.16 / Vitest 4 / MSW 2 / zod 4 / Playwright 1.61 · GitHub Actions · Docker Compose (PostgreSQL 16, Redis 7)

**Spec:** Ayrı bir tasarım dokümanı yok; plan şu kaynaklara dayanır ve yürütücü bunları da okur:
`AGENTS.md`, `docs/spec/current-system/contracts.md` (endpoint, hata şekli, uyumluluk kuralları),
`docs/spec/current-system/architecture.md` (frontend → Spring sınırı),
`docs/agent/verification.md` (komutlar, smoke kataloğu, Definition of Done).

## Mevcut durumdan tespitler (2026-10-17, kod üzerinden doğrulandı)

| # | Bulgu | Kanıt | Bu plandaki karşılığı |
|---|---|---|---|
| F1 | Base URL sabit kodlu; ortam üzerinden değiştirilemiyor. Aynı string 7 Vitest dosyasında ve 3 E2E dosyasında tekrar ediyor. | `frontend/src/api/client.ts:5`, `grep localhost:8080 frontend/src` | Task 2 |
| F2 | Backend'in `{timestamp,status,error,message,path}` hata gövdesi frontend'de okunmuyor; kullanıcı "Request failed with status code 409" görüyor, "Portfolio cannot be deleted while it has active holdings" değil. | `PortfolioManagerView.tsx:440`, `GlobalExceptionHandler.java:89-100`, `PortfolioManagementController.java:85` | Task 2 |
| F3 | Frontend TS tipleri elle yazılmış, backend DTO'larıyla otomatik karşılaştırma yok. Örnek kayma: `PortfolioPerformanceResponse.metrics` frontend'de `volatility` bekliyor (backend hiç göndermiyor) ve `sharpe`/`maxDrawdown`'u `number` sanıyor (backend `null` gönderebiliyor). | `client.ts:196-206` ↔ `PortfolioDashboardController.java:761-798` | Task 3, Task 4 |
| F4 | Entegre E2E (`E2E_INTEGRATED=true`) stub gövdeleri gerçek DTO'larla uyuşmuyor (`totalCost`, `totalPnl`, `byAssetType`, `points`). | `frontend/e2e/integrated.spec.ts:47-60` | Task 5 |
| F5 | Entegre E2E seçicileri redesign'dan sonra artık var olmayan metinleri arıyor (`Add stock/ETF...`, `New portfolio name...`, `Create Portfolio`, `Add instrument`). | `grep` sonucu `frontend/src` içinde 0 eşleşme | Task 5 |
| F6 | CI yalnız mock'lu E2E çalıştırıyor; gerçek backend'e karşı hiçbir tarayıcı akışı CI'da yok. | `.github/workflows/ci.yml:116-118` | Task 6 |

Uyumlu olan taraf: frontend'in çağırdığı her yol backend controller'larında mevcut (controller mapping listesi ile `client.ts` + hook'lardaki `apiClient` çağrıları karşılaştırıldı). Bu plan endpoint veya DTO alanı **yeniden adlandırmaz**.

## Ön koşul — dal ve çalışma ağacı (yürütmeden önce kullanıcı kararı)

Mevcut dal `design/research-desk-html-20261017` ve üzerinde commit edilmemiş geniş bir redesign değişikliği var (56 dosya, `frontend/src/components/research/` dahil). Bu planın testleri redesign'daki Türkçe arayüze göre yazıldı.

- Uygulama dalı `feat/frontend-backend-integration` olmalı ve redesign değişikliklerini **içeren** bir commit'ten başlamalı. Redesign değişiklikleri bu planın commit'lerine karıştırılmaz (AGENTS.md: ilgisiz değişiklikleri koru, kapsam dışı tut).
- Redesign henüz commit edilmediyse önce kendi dalında ayrı commit'ler hâlinde kaydedilmesi gerekir. Bu karar kullanıcınındır; yürütücü bu durumu görürse durup sorar.

## Global Constraints

- Endpoint yolları ve DTO alanları değişmez; değişirse tüm tüketiciler aynı değişiklikte taşınır (`AGENTS.md`, `contracts.md` Compatibility Rules).
- Normal frontend akışları Spring backend'den geçer; data-service'e doğrudan tarayıcı çağrısı eklenmez.
- Piyasa verisi, metadata, haber, analiz veya AI çıktısı uydurulmaz. Fixture değerleri test verisidir ve öyle etiketlenir.
- Otomatik testler canlı finansal sağlayıcı çağırmaz; yalnız I/O sınırında stub/MSW/`page.route` kullanılır.
- Backend kontrol komutu: `backend/` içinde Windows `.\mvnw.cmd test`, Unix `./mvnw test`.
- Frontend kontrol komutları: `frontend/` içinde `npm run lint`, `npm run test:coverage`, `npm run build`; route/kritik akış etkilendiğinde `npm run e2e`.
- `src/api/client.ts` coverage eşiği: statements 95, branches 80, functions 95, lines 95 (`vitest.config.ts`).
- Commit biçimi: `<type>(<scope>): <imperative summary>`, en fazla 72 karakter, nokta yok; scope'lar `backend`, `frontend`, `infra`, `spec`.
- Her commit mesajı şu satırla biter: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- `.env`, sırlar, build çıktısı, `node_modules`, `playwright-report/` commit edilmez.

## Review Focus

1. **Backend kapalı / ağ hatası** → kullanıcı sonsuz yükleme veya boş ekran değil, "Sunucuya ulaşılamadı. Backend çalışıyor mu?" mesajı görür. (Task 2, `errors.test.ts` "marks transport failures as network errors")
2. **Proxy/gateway'den JSON olmayan hata gövdesi (HTML 502)** → çökme yok, "İstek başarısız oldu (HTTP 502)." gösterilir. (Task 2, "falls back to the HTTP status when the body is not the backend contract")
3. **Backend `message` alanı boş** → boş kırmızı kutu değil, HTTP durumlu yedek mesaj. (Task 2, "falls back to the HTTP status when the backend message is blank")
4. **İptal edilen istek (AbortController)** → hata mesajına dönüştürülmez, axios `CanceledError` olarak kalır; böylece unmount sonrası sahte hata görünmez. (Task 2, "passes cancellations through unchanged")
5. **Sayfa yüklendikten sonra backend durumu değişti (bayat UI)** → UI'nin izin verdiği silme backend'de 409 alırsa, backend'in gerçek gerekçesi modalda görünür ve seçim değişmez. (Task 2 bileşen testi + Task 5 entegre E2E)

---

### Task 1: Taban çizgisi — mevcut kontrollerin durumunu kaydet

Kod değişikliği yok, commit yok. Amaç: sonraki görevlerde kırmızıya dönen bir testin bu planın etkisi mi yoksa önceden mi kırık olduğunu ayırt edebilmek.

**Files:** yok (çıktılar yalnız yürütme raporuna yazılır)

- [ ] **Step 1: Dalı doğrula**

Run (repo kökü): `git status --short | head -5; git branch --show-current`
Expected: `feat/frontend-backend-integration`. Değilse Ön koşul bölümüne dön ve dur.

- [ ] **Step 2: Backend testleri**

Run (`backend/`): `.\mvnw.cmd test`
Expected: `BUILD SUCCESS`. Docker yoksa Testcontainers sınıflarının skip edildiğini rapora not et (verification.md gereği tam entegrasyon kapsamı iddia edilmez).

- [ ] **Step 3: Frontend kontrolleri**

Run (`frontend/`): `npm run lint`, `npm run test:coverage`, `npm run build`, `npm run e2e`
Expected: dördü de geçer. Kırmızı olan her komutun ilk hata özetini rapora yaz. Taban çizgisi kırmızıysa ve hata bu planın dokunacağı dosyalardaysa (Files listeleri), devam etmeden kullanıcıya bildir.

---

### Task 2: Yapılandırılabilir base URL ve backend hata sözleşmesinin frontend'e taşınması

**Files:**
- Create: `frontend/src/api/config.ts`
- Create: `frontend/src/api/errors.ts`
- Create: `frontend/src/api/errors.test.ts`
- Create: `frontend/.env.example`
- Modify: `frontend/src/api/client.ts:1-9` (import, `baseURL`, interceptor)
- Modify: `frontend/src/components/PortfolioManagerView.test.tsx` (yeni test + `API_BASE` kaynağı)
- Modify (yalnız `API_BASE` sabitinin kaynağı): `frontend/src/api/client.test.ts:60`, `frontend/src/App.routes.test.tsx:8`, `frontend/src/components/DashboardHome.test.tsx:9`, `frontend/src/components/research/ResearchAgentReport.test.tsx:7`, `frontend/src/components/research/ResearchWorkspace.test.tsx:10`, `frontend/src/hooks/hooks.test.tsx:19`
- Modify: `docs/spec/current-system/architecture.md` (frontend API erişimi notu)

**Interfaces:**
- Consumes: yok
- Produces:
  - `resolveApiBaseUrl(raw: string | undefined): string` ve `API_BASE_URL: string` — `src/api/config.ts`
  - `class ApiError extends Error { readonly status: number | null; readonly path: string | null; readonly isNetworkError: boolean }` — `src/api/errors.ts`
  - `toApiError(error: unknown): ApiError` — `src/api/errors.ts`
  - `apiClient` artık HTTP/ağ hatalarında `ApiError` ile reject eder; iptallerde axios `CanceledError` ile reject eder.

- [ ] **Step 1: Başarısız testleri yaz**

`frontend/src/api/errors.test.ts`:

```ts
import { http, HttpResponse } from 'msw';
import { isCancel } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiClient } from './client';
import { API_BASE_URL, resolveApiBaseUrl } from './config';
import { ApiError } from './errors';
import { server } from '../test/server';

const url = (path: string) => `${API_BASE_URL}${path}`;

const captureRejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to reject');
};

describe('resolveApiBaseUrl', () => {
  it('defaults to the Spring API base when no override is configured', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:8080/api/v1');
    expect(resolveApiBaseUrl('   ')).toBe('http://localhost:8080/api/v1');
  });

  it('strips trailing slashes from an override', () => {
    expect(resolveApiBaseUrl('/api/v1/')).toBe('/api/v1');
    expect(resolveApiBaseUrl('https://api.example.test/api/v1//')).toBe('https://api.example.test/api/v1');
  });
});

describe('apiClient error normalization', () => {
  it('uses the backend error contract message and status', async () => {
    server.use(
      http.delete(url('/portfolios/2'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'Portfolio cannot be deleted while it has active holdings',
        path: '/api/v1/portfolios/2',
      }, { status: 409 })),
    );

    const error = await captureRejection(apiClient.delete('/portfolios/2'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Portfolio cannot be deleted while it has active holdings',
      status: 409,
      path: '/api/v1/portfolios/2',
      isNetworkError: false,
    });
  });

  it('falls back to the HTTP status when the body is not the backend contract', async () => {
    server.use(
      http.get(url('/macro/snapshot'), () => new HttpResponse('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })),
    );

    const error = await captureRejection(apiClient.get('/macro/snapshot'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'İstek başarısız oldu (HTTP 502).', status: 502, path: null, isNetworkError: false });
  });

  it('falls back to the HTTP status when the backend message is blank', async () => {
    server.use(
      http.get(url('/macro/snapshot'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 503,
        error: 'Service Unavailable',
        message: '   ',
        path: '/api/v1/macro/snapshot',
      }, { status: 503 })),
    );

    const error = await captureRejection(apiClient.get('/macro/snapshot'));

    expect(error).toMatchObject({ message: 'İstek başarısız oldu (HTTP 503).', status: 503 });
  });

  it('marks transport failures as network errors', async () => {
    server.use(http.get(url('/assets'), () => HttpResponse.error()));

    const error = await captureRejection(apiClient.get('/assets'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Sunucuya ulaşılamadı. Backend çalışıyor mu?',
      status: null,
      isNetworkError: true,
    });
  });

  it('passes cancellations through unchanged', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await captureRejection(apiClient.get('/assets', { signal: controller.signal }));

    expect(isCancel(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
```

`frontend/src/components/PortfolioManagerView.test.tsx` içinde, `describe('PortfolioManagerView', ...)` bloğunun sonuna (son `it` ile kapanış `});` arasına) ekle ve dosyanın başına `import { deleteInvestmentPortfolio } from '../api/client';` ekle:

```tsx
  it('shows the backend conflict message when the server rejects a deletion the UI allowed', async () => {
    server.use(
      http.get(apiUrl('/portfolio/positions/performance'), () => HttpResponse.json([])),
      http.get(apiUrl('/portfolios/:portfolioId/transactions'), () => HttpResponse.json([])),
      http.delete(apiUrl('/portfolios/2'), () => HttpResponse.json({
        timestamp: '2026-10-17T10:00:00Z',
        status: 409,
        error: 'Conflict',
        message: 'Portfolio cannot be deleted while it has active holdings',
        path: '/api/v1/portfolios/2',
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    const stalePortfolio: Portfolio = { id: '2', name: 'Stale', holdings: [] };
    const onSelectPortfolioId = vi.fn();

    renderPortfolio(stalePortfolio, [], {
      portfolios: [portfolio, stalePortfolio],
      activePortfolioId: stalePortfolio.id,
      onDeletePortfolio: async () => {
        await deleteInvestmentPortfolio(2);
      },
      onSelectPortfolioId,
    });

    await user.click(screen.getByRole('button', { name: 'Portföyü sil' }));
    const deleteButtons = screen.getAllByRole('button', { name: 'Portföyü sil' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    expect(await screen.findByText('Portfolio cannot be deleted while it has active holdings')).toBeInTheDocument();
    expect(onSelectPortfolioId).not.toHaveBeenCalled();
  });
```

Backend mesajı İngilizce olduğu için olduğu gibi gösterilir; frontend çevirmez veya yeniden yazmaz (uydurma gerekçe üretmemek için).

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

Run (`frontend/`): `npx vitest run --config vitest.config.ts src/api/errors.test.ts src/components/PortfolioManagerView.test.tsx`
Expected: `errors.test.ts` → `Failed to resolve import "./config"`; PortfolioManagerView yeni testi → `Unable to find an element with the text: Portfolio cannot be deleted while it has active holdings` (ekranda `Request failed with status code 409` vardır).

- [ ] **Step 3: `config.ts` ve `errors.ts`'i yaz**

`frontend/src/api/config.ts`:

```ts
const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export const resolveApiBaseUrl = (raw: string | undefined): string => {
  const trimmed = raw?.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : DEFAULT_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
```

`frontend/src/api/errors.ts`:

```ts
import { isAxiosError } from 'axios';

/** Spring global error body: see docs/spec/current-system/contracts.md "Backend errors". */
export interface BackendErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

interface ApiErrorDetails {
  status: number | null;
  path: string | null;
  isNetworkError: boolean;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly path: string | null;
  readonly isNetworkError: boolean;

  constructor(message: string, details: ApiErrorDetails) {
    super(message, { cause: details.cause });
    this.name = 'ApiError';
    this.status = details.status;
    this.path = details.path;
    this.isNetworkError = details.isNetworkError;
  }
}

const isBackendErrorBody = (value: unknown): value is BackendErrorBody => {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.status === 'number' && typeof body.message === 'string';
};

export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError('Sunucuya ulaşılamadı. Backend çalışıyor mu?', {
        status: null,
        path: null,
        isNetworkError: true,
        cause: error,
      });
    }

    const body: unknown = response.data;
    if (isBackendErrorBody(body) && body.message.trim()) {
      return new ApiError(body.message, {
        status: response.status,
        path: typeof body.path === 'string' ? body.path : null,
        isNetworkError: false,
        cause: error,
      });
    }

    return new ApiError(`İstek başarısız oldu (HTTP ${response.status}).`, {
      status: response.status,
      path: null,
      isNetworkError: false,
      cause: error,
    });
  }

  const message = error instanceof Error ? error.message : 'Beklenmeyen hata.';
  return new ApiError(message, { status: null, path: null, isNetworkError: false, cause: error });
};
```

- [ ] **Step 4: `client.ts`'i bağla**

`frontend/src/api/client.ts` başını şu hâle getir (satır 1-9'un yerine):

```ts
import axios, { isCancel } from 'axios';
import type { Asset, PriceHistory } from './types';
import { API_BASE_URL } from './config';
import { toApiError } from './errors';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(isCancel(error) ? error : toApiError(error)),
);
```

- [ ] **Step 5: Testlerin geçtiğini doğrula**

Run: `npx vitest run --config vitest.config.ts src/api/errors.test.ts src/components/PortfolioManagerView.test.tsx`
Expected: tümü PASS.

- [ ] **Step 6: Test dosyalarındaki sabit base URL'yi tek kaynağa bağla**

`VITE_API_BASE_URL` bir geliştiricinin `.env.local` dosyasında tanımlıysa Vitest onu da yükler; sabit kodlu test URL'leri o zaman MSW eşleşmesini kaçırır. Aşağıdaki her dosyada sabit tanımı kaldırıp import ile değiştir (değişken adı dosyadaki gibi kalır):

| Dosya | Eski satır | Yeni |
|---|---|---|
| `src/api/client.test.ts` | `const API_BASE = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as API_BASE } from './config';` |
| `src/App.routes.test.tsx` | `const API_BASE = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as API_BASE } from './api/config';` |
| `src/components/DashboardHome.test.tsx` | `const API_BASE = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as API_BASE } from '../api/config';` |
| `src/components/PortfolioManagerView.test.tsx` | `const API_BASE = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as API_BASE } from '../api/config';` |
| `src/hooks/hooks.test.tsx` | `const API_BASE = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as API_BASE } from '../api/config';` |
| `src/components/research/ResearchAgentReport.test.tsx` | `const base = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as base } from '../../api/config';` |
| `src/components/research/ResearchWorkspace.test.tsx` | `const base = 'http://localhost:8080/api/v1';` | `import { API_BASE_URL as base } from '../../api/config';` |

Import'u dosyanın diğer import'larının yanına taşı. Doğrula: `grep -rn "localhost:8080" frontend/src` yalnız `src/api/config.ts` satırını döndürmeli.

- [ ] **Step 7: Ortam değişkenini belgele**

`frontend/.env.example`:

```dotenv
# Spring backend API base URL used by the browser client.
# Default when unset: http://localhost:8080/api/v1
# Use /api/v1 to route through the Vite dev-server proxy (vite.config.ts) instead of CORS.
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`docs/spec/current-system/architecture.md` içinde frontend API erişimini anlatan bölüme (yoksa frontend bölümünün sonuna) şu paragrafı ekle:

```markdown
Frontend API access goes through `frontend/src/api/client.ts` (`apiClient`). The
base URL comes from `frontend/src/api/config.ts`: `VITE_API_BASE_URL` when set,
otherwise `http://localhost:8080/api/v1`. A response interceptor converts HTTP and
transport failures into `ApiError` (`frontend/src/api/errors.ts`), whose `message`
is the Spring error body's `message` when present; request cancellations are passed
through unchanged.
```

- [ ] **Step 8: Frontend kontrollerinin tamamı**

Run (`frontend/`): `npm run lint`, `npm run test:coverage`, `npm run build`
Expected: üçü de geçer; `src/api/client.ts` coverage eşikleri korunur. Interceptor'ın reject kolu `errors.test.ts` ile kapsanır.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/config.ts frontend/src/api/errors.ts frontend/src/api/errors.test.ts frontend/src/api/client.ts frontend/.env.example \
  frontend/src/api/client.test.ts frontend/src/App.routes.test.tsx frontend/src/components/DashboardHome.test.tsx \
  frontend/src/components/PortfolioManagerView.test.tsx frontend/src/hooks/hooks.test.tsx \
  frontend/src/components/research/ResearchAgentReport.test.tsx frontend/src/components/research/ResearchWorkspace.test.tsx \
  docs/spec/current-system/architecture.md
git commit -m "feat(frontend): surface backend error messages via ApiError" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Not: `client.ts` ve bazı test dosyalarında redesign'dan gelen commit edilmemiş değişiklikler varsa (Ön koşul), `git add -p` ile yalnız bu görevin hunk'larını ekle.

---

### Task 3: Ortak sözleşme fixture'ları ve backend şekil testleri

**Files:**
- Create: `docs/contracts/fixtures/README.md`
- Create: `docs/contracts/fixtures/portfolio-summary.json`
- Create: `docs/contracts/fixtures/portfolio-performance.json`
- Create: `docs/contracts/fixtures/portfolio-enriched-positions.json`
- Create: `docs/contracts/fixtures/error-response.json`
- Create: `backend/src/test/java/com/ozkaslibasar/financeproject/contract/ContractFixtures.java`
- Create: `backend/src/test/java/com/ozkaslibasar/financeproject/contract/ContractFixturesTest.java`
- Create: `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioDashboardContractTest.java`
- Modify: `docs/spec/current-system/contracts.md` (yeni alt bölüm)

**Interfaces:**
- Consumes: yok (production kodu değişmez)
- Produces:
  - Fixture dosya adları: `portfolio-summary.json`, `portfolio-performance.json`, `portfolio-enriched-positions.json`, `error-response.json` (Task 4 ve Task 5 bu adları kullanır)
  - `ContractFixtures.assertSameShape(String fixtureName, String actualJson)` ve `ContractFixtures.shapeOf(JsonNode)` (paket-içi)

**Şekil kuralı:** JSON şekli, tüm alan yollarının sıralı kümesidir: `$.a`, `$.a.b`, dizi elemanları için `$.list[].field`. `null` değer yaprak sayılır. Değerler karşılaştırılmaz. Bu yüzden testlerde stub verisi tüm dizileri dolu ve tüm nesneleri non-null üretecek şekilde seçilir.

- [ ] **Step 1: Şekil yardımcısı için başarısız test**

`backend/src/test/java/com/ozkaslibasar/financeproject/contract/ContractFixturesTest.java`:

```java
package com.ozkaslibasar.financeproject.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContractFixturesTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void collectsNestedObjectAndArrayFieldPaths() throws Exception {
        var node = mapper.readTree("""
                {"period":"1M","series":[{"date":"d","value":1}],"metrics":{"sharpe":null}}
                """);

        assertThat(ContractFixtures.shapeOf(node)).containsExactly(
                "$.metrics",
                "$.metrics.sharpe",
                "$.period",
                "$.series",
                "$.series[].date",
                "$.series[].value");
    }

    @Test
    void distinguishesRenamedFields() throws Exception {
        var backend = mapper.readTree("{\"totalPnL\":1}");
        var renamed = mapper.readTree("{\"totalPnl\":1}");

        assertThat(ContractFixtures.shapeOf(backend)).isNotEqualTo(ContractFixtures.shapeOf(renamed));
    }

    @Test
    void ignoresValuesAndTreatsNullAsLeaf() throws Exception {
        var populated = mapper.readTree("{\"sharpe\":1.5,\"maxDrawdown\":-3.2}");
        var empty = mapper.readTree("{\"sharpe\":null,\"maxDrawdown\":null}");

        assertThat(ContractFixtures.shapeOf(populated)).isEqualTo(ContractFixtures.shapeOf(empty));
    }
}
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run (`backend/`): `.\mvnw.cmd test -Dtest=ContractFixturesTest`
Expected: derleme hatası `cannot find symbol: class ContractFixtures`.

- [ ] **Step 3: Yardımcıyı yaz**

`backend/src/test/java/com/ozkaslibasar/financeproject/contract/ContractFixtures.java`:

```java
package com.ozkaslibasar.financeproject.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shared HTTP contract fixtures in docs/contracts/fixtures. Backend tests pin the
 * serialized field shape; frontend tests parse the same files, so a field rename on
 * either side fails that side's build.
 */
public final class ContractFixtures {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    // Maven runs tests with backend/ as the working directory.
    private static final Path FIXTURE_DIR = Path.of("..", "docs", "contracts", "fixtures");

    private ContractFixtures() {
    }

    public static void assertSameShape(String fixtureName, String actualJson) throws IOException {
        JsonNode fixture = MAPPER.readTree(Files.readString(FIXTURE_DIR.resolve(fixtureName)));
        JsonNode actual = MAPPER.readTree(actualJson);
        assertThat(shapeOf(actual))
                .as("Serialized response shape must match docs/contracts/fixtures/%s", fixtureName)
                .isEqualTo(shapeOf(fixture));
    }

    static SortedSet<String> shapeOf(JsonNode node) {
        SortedSet<String> paths = new TreeSet<>();
        collect(node, "$", paths);
        return paths;
    }

    private static void collect(JsonNode node, String path, SortedSet<String> paths) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String childPath = path + "." + field.getKey();
                paths.add(childPath);
                collect(field.getValue(), childPath, paths);
            }
        } else if (node.isArray()) {
            for (JsonNode element : node) {
                collect(element, path + "[]", paths);
            }
        }
    }
}
```

- [ ] **Step 4: Yardımcı testinin geçtiğini doğrula**

Run: `.\mvnw.cmd test -Dtest=ContractFixturesTest`
Expected: `Tests run: 3, Failures: 0`.

- [ ] **Step 5: Fixture dosyalarını yaz**

Değerler `PortfolioDashboardContractTest` stub senaryosundan elle türetilmiştir: AAPL 2 adet, ortalama maliyet 90, önceki kapanış 100, son kapanış 110; benchmark SPY 400 → 440. Toplam getiri = (220 − 180) / 180 = %22,22.

`docs/contracts/fixtures/portfolio-summary.json`:

```json
{
  "totalValue": 220,
  "cashBalance": 0,
  "dailyPnL": 20,
  "dailyPnLPercent": 10.0,
  "totalPnL": 40,
  "totalReturn": 22.22
}
```

`docs/contracts/fixtures/portfolio-performance.json`:

```json
{
  "period": "1M",
  "series": [
    { "date": "2026-10-15", "portfolioValue": 200, "benchmarkValue": 200.0 },
    { "date": "2026-10-16", "portfolioValue": 220, "benchmarkValue": 220.0 }
  ],
  "metrics": { "sharpe": null, "maxDrawdown": 0.0 }
}
```

`docs/contracts/fixtures/portfolio-enriched-positions.json`:

```json
[
  {
    "symbol": "AAPL",
    "company": "AAPL",
    "shares": 2,
    "avgCost": 90,
    "currentPrice": 110,
    "costBasis": 180,
    "marketValue": 220,
    "allocation": 100.0,
    "dailyReturn": 10.0,
    "totalReturn": 22.22,
    "unrealizedPnL": 40
  }
]
```

`docs/contracts/fixtures/error-response.json`:

```json
{
  "timestamp": "2026-10-17T10:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Portfolio cannot be deleted while it has active holdings",
  "path": "/api/v1/portfolios/2"
}
```

`docs/contracts/fixtures/README.md`:

```markdown
# HTTP Contract Fixtures

Each JSON file is a representative Spring `/api/v1` response body shared by the
backend and frontend test suites. Values are test data derived by hand from the
stub scenario in `PortfolioDashboardContractTest`; they are not market data and
must never be served to users.

- Backend: `ContractFixtures.assertSameShape` compares the serialized field-path
  set of a real controller response with the fixture (values are ignored, `null`
  is a leaf).
- Frontend: `src/api/contract.test.ts` parses every fixture with a strict zod
  schema that mirrors the TypeScript type in `src/api/client.ts`.

Changing a field name therefore fails the backend test, the frontend test, or both.
To add a fixture: write the JSON with every array non-empty and every object
non-null, add a backend shape test for the endpoint, and add a frontend schema test.

| Fixture | Endpoint |
|---|---|
| `portfolio-summary.json` | `GET /portfolio/summary` |
| `portfolio-performance.json` | `GET /portfolio/performance?period=&benchmark=` |
| `portfolio-enriched-positions.json` | `GET /portfolio/positions/enriched` |
| `error-response.json` | Any Spring 4xx/5xx handled by `GlobalExceptionHandler` |
```

- [ ] **Step 6: Endpoint şekil testlerini yaz**

`backend/src/test/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioDashboardContractTest.java`:

```java
package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.contract.ContractFixtures;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins dashboard response shapes to docs/contracts/fixtures. Ports and the price
 * service are mocked because they are the I/O boundary (database and providers).
 */
@WebMvcTest(controllers = PortfolioDashboardController.class)
class PortfolioDashboardContractTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PortfolioPositionPort positionPort;

    @MockitoBean
    private PortfolioPort portfolioPort;

    @MockitoBean
    private PortfolioTransactionPort transactionPort;

    @MockitoBean
    private PortfolioLedgerService ledgerService;

    @MockitoBean
    private PriceRefreshService priceRefreshService;

    @BeforeEach
    void stubOnePricedPosition() {
        LocalDateTime previous = LocalDateTime.now().minusDays(2);
        LocalDateTime latest = LocalDateTime.now().minusDays(1);
        when(positionPort.findByUserId("default")).thenReturn(List.of(position("AAPL", "2", "90")));
        when(priceRefreshService.getFreshLatest("AAPL")).thenReturn(Optional.of(price("AAPL", "110", latest)));
        when(priceRefreshService.getFreshHistory(eq("AAPL"), eq("1d"), anyString()))
                .thenReturn(List.of(price("AAPL", "100", previous), price("AAPL", "110", latest)));
        when(priceRefreshService.getFreshHistory(eq("SPY"), eq("1d"), anyString()))
                .thenReturn(List.of(price("SPY", "400", previous), price("SPY", "440", latest)));
    }

    @Test
    void summaryMatchesSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/summary"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-summary.json", body);
    }

    @Test
    void performanceMatchesSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/performance")
                        .param("period", "1M")
                        .param("benchmark", "SP500"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-performance.json", body);
    }

    @Test
    void enrichedPositionsMatchSharedContractFixture() throws Exception {
        String body = mockMvc.perform(get("/api/v1/portfolio/positions/enriched"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("portfolio-enriched-positions.json", body);
    }

    @Test
    void errorBodyMatchesSharedContractFixture() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        when(portfolioPort.findByUserId("default"))
                .thenReturn(List.of(new Portfolio(10L, "default", "ALFA", "USD", null, false, now, now)));

        String body = mockMvc.perform(get("/api/v1/portfolio/performance/comparison")
                        .param("portfolioIds", "99")
                        .param("period", "6M"))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();

        ContractFixtures.assertSameShape("error-response.json", body);
    }

    private PortfolioPosition position(String symbol, String quantity, String avgCostPrice) {
        LocalDateTime now = LocalDateTime.now();
        return new PortfolioPosition(1L, "default", symbol, new BigDecimal(quantity), new BigDecimal(avgCostPrice),
                LocalDate.now().minusDays(10), null, now, now);
    }

    private PriceHistory price(String symbol, String close, LocalDateTime timestamp) {
        BigDecimal value = new BigDecimal(close);
        return new PriceHistory(symbol, value, value, value, value, BigDecimal.valueOf(1000), timestamp);
    }
}
```

Constructor imzaları `PortfolioDashboardControllerTest.java:252-312` yardımcılarından kopyalanmıştır.

- [ ] **Step 7: Endpoint şekil testlerini çalıştır**

Run: `.\mvnw.cmd test -Dtest=PortfolioDashboardContractTest`
Expected: `Tests run: 4, Failures: 0`.
Bir test farklı yol kümesiyle düşerse AssertJ farkı yazdırır. Fark bir fixture yazım hatasıysa (ör. `unrealizedPnL` yerine `unrealizedPnl`) fixture'ı düzelt. Fark gerçek DTO alanını gösteriyorsa (backend fixture'da olmayan bir alan gönderiyorsa) fixture'a o alanı ekle ve Task 4'teki frontend şemasına da ekle — production DTO'yu bu planda değiştirme.

- [ ] **Step 8: `contracts.md`'ye bölüm ekle**

`docs/spec/current-system/contracts.md` içinde `### Partial research` başlığından önce:

```markdown
### Shared contract fixtures

`docs/contracts/fixtures/` holds representative Spring response bodies that both
test suites read. Backend `@WebMvcTest` classes assert that a real serialized
response has the same field-path set as the fixture; frontend Vitest parses each
fixture with a strict schema mirroring `frontend/src/api/client.ts`. Fixture values
are test data, not market data. Covered today: portfolio summary, performance,
enriched positions, and the backend error body.
```

- [ ] **Step 9: Backend paketinin tamamı**

Run: `.\mvnw.cmd test`
Expected: `BUILD SUCCESS`; Task 1 taban çizgisinden yeni kırmızı yok.

- [ ] **Step 10: Commit**

```bash
git add docs/contracts/fixtures backend/src/test/java/com/ozkaslibasar/financeproject/contract \
  backend/src/test/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioDashboardContractTest.java \
  docs/spec/current-system/contracts.md
git commit -m "test(backend): pin dashboard and error shapes to shared fixtures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Frontend sözleşme testleri ve tip kaymasının düzeltilmesi

**Files:**
- Create: `frontend/src/test/contractFixtures.ts`
- Create: `frontend/src/api/contract.test.ts`
- Modify: `frontend/src/api/client.ts:196-206` (`PortfolioPerformancePoint`, `PortfolioPerformanceResponse`)

**Interfaces:**
- Consumes: Task 2 `API_BASE_URL`, `ApiError`; Task 3 fixture dosya adları
- Produces: `loadContractFixture(name: string): unknown` — `src/test/contractFixtures.ts`

- [ ] **Step 1: Başarısız testi yaz**

`frontend/src/api/contract.test.ts`:

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  deleteInvestmentPortfolio,
  fetchEnrichedPositions,
  fetchPortfolioPerformance,
  fetchPortfolioSummary,
} from './client';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';
import { loadContractFixture } from '../test/contractFixtures';
import { server } from '../test/server';

// Strict schemas mirror the TypeScript types in client.ts. A field the backend adds,
// renames, or nulls without the frontend type knowing makes these parses fail.
const PortfolioSummarySchema = z.strictObject({
  totalValue: z.number(),
  cashBalance: z.number(),
  dailyPnL: z.number(),
  dailyPnLPercent: z.number(),
  totalPnL: z.number(),
  totalReturn: z.number(),
});

const PortfolioPerformanceSchema = z.strictObject({
  period: z.string(),
  series: z.array(z.strictObject({
    date: z.string(),
    portfolioValue: z.number(),
    benchmarkValue: z.number().nullable().optional(),
  })),
  metrics: z.strictObject({
    sharpe: z.number().nullable(),
    maxDrawdown: z.number().nullable(),
  }).optional(),
});

const EnrichedPositionsSchema = z.array(z.strictObject({
  symbol: z.string(),
  company: z.string(),
  shares: z.number(),
  avgCost: z.number(),
  currentPrice: z.number(),
  costBasis: z.number(),
  marketValue: z.number(),
  allocation: z.number(),
  dailyReturn: z.number(),
  totalReturn: z.number(),
  unrealizedPnL: z.number(),
}));

const BackendErrorSchema = z.strictObject({
  timestamp: z.string(),
  status: z.number().int(),
  error: z.string(),
  message: z.string(),
  path: z.string(),
});

const url = (path: string) => `${API_BASE_URL}${path}`;

describe('shared HTTP contract fixtures', () => {
  it('portfolio summary fixture matches the frontend type and passes through the client', async () => {
    const fixture = PortfolioSummarySchema.parse(loadContractFixture('portfolio-summary.json'));
    server.use(http.get(url('/portfolio/summary'), () => HttpResponse.json(fixture)));

    await expect(fetchPortfolioSummary()).resolves.toEqual(fixture);
  });

  it('portfolio performance fixture matches the frontend type, including nullable metrics', async () => {
    const fixture = PortfolioPerformanceSchema.parse(loadContractFixture('portfolio-performance.json'));
    server.use(http.get(url('/portfolio/performance'), () => HttpResponse.json(fixture)));

    await expect(fetchPortfolioPerformance('1M', 'SP500')).resolves.toEqual(fixture);
  });

  it('enriched positions fixture matches the frontend type', async () => {
    const fixture = EnrichedPositionsSchema.parse(loadContractFixture('portfolio-enriched-positions.json'));
    server.use(http.get(url('/portfolio/positions/enriched'), () => HttpResponse.json(fixture)));

    await expect(fetchEnrichedPositions()).resolves.toEqual(fixture);
  });

  it('backend error fixture becomes an ApiError carrying the backend message', async () => {
    const fixture = BackendErrorSchema.parse(loadContractFixture('error-response.json'));
    server.use(http.delete(url('/portfolios/2'), () => HttpResponse.json(fixture, { status: fixture.status })));

    const rejection = deleteInvestmentPortfolio(2);

    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({ message: fixture.message, status: fixture.status });
  });
});
```

- [ ] **Step 2: Başarısız olduğunu doğrula**

Run (`frontend/`): `npx vitest run --config vitest.config.ts src/api/contract.test.ts`
Expected: `Failed to resolve import "../test/contractFixtures"`.

- [ ] **Step 3: Fixture yükleyicisini yaz**

`frontend/src/test/contractFixtures.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixturesDir = new URL('../../../docs/contracts/fixtures/', import.meta.url);

export const loadContractFixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(name, fixturesDir)), 'utf8'));
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx vitest run --config vitest.config.ts src/api/contract.test.ts`
Expected: 4 test PASS.

- [ ] **Step 5: TS tipini backend gerçeğine hizala (F3)**

`frontend/src/api/client.ts` içinde:

```ts
export interface PortfolioPerformancePoint {
  date: string;
  portfolioValue: number;
  benchmarkValue?: number | null;
}

export interface PortfolioPerformanceResponse {
  period: string;
  series: PortfolioPerformancePoint[];
  metrics?: { sharpe: number | null; maxDrawdown: number | null };
}
```

`volatility` kaldırılır: backend `PortfolioMetrics(Double sharpe, Double maxDrawdown)` bu alanı hiç göndermiyor ve `frontend/src` içinde okuyan yok (`grep -rn "volatility" frontend/src --include=*.tsx` ile yeniden doğrula; bir okuyucu çıkarsa o okuyucu `—` göstermeli, sahte değer üretmemeli).

- [ ] **Step 6: Tip değişikliğinin tüketicilerini derle**

Run: `npm run build`
Expected: geçer. `tsc` bir tüketicide `number | null` hatası verirse, o tüketici `null` için mevcut boş durum gösterimini (`—` / "veri yok") kullanacak şekilde düzeltilir; `0` ile doldurulmaz.

- [ ] **Step 7: Frontend kontrollerinin tamamı**

Run: `npm run lint`, `npm run test:coverage`, `npm run build`
Expected: üçü de geçer.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/test/contractFixtures.ts frontend/src/api/contract.test.ts frontend/src/api/client.ts
git commit -m "test(frontend): validate API types against shared fixtures" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Step 6'da bir bileşen düzeltildiyse o dosyayı da ekle.)

---

### Task 5: Entegre E2E'yi redesign'a ve gerçek sözleşmeye göre onar

**Files:**
- Create: `frontend/e2e/contractFixtures.ts`
- Modify: `frontend/e2e/integrated.spec.ts`

**Interfaces:**
- Consumes: Task 3 fixture'ları; Task 2 hata davranışı (UI'de backend mesajı)
- Produces: `npm run e2e:integrated` gerçek backend'e karşı yeşil (Task 6 bunu CI'da çalıştırır)

Ön koşul (yerel): `docker compose up -d postgres redis`, ardından `backend/` içinde `.\mvnw.cmd spring-boot:run`; `http://localhost:8080/actuator/health` → `UP`. Global setup veritabanını `TRUNCATE` edip tohumlar — yalnız yerel geliştirme veritabanında çalıştır.

- [ ] **Step 1: Mevcut entegre paketi çalıştırıp kırılmayı kaydet**

Run (`frontend/`): `npm run e2e:integrated`
Expected: FAIL — watchlist testinde `getByPlaceholder('Add stock/ETF...')` ve portföy testinde `getByPlaceholder('New portfolio name...')` için timeout (F5).

- [ ] **Step 2: Playwright fixture yükleyicisini yaz**

`frontend/e2e/contractFixtures.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixturesDir = new URL('../../docs/contracts/fixtures/', import.meta.url);

export const loadContractFixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(name, fixturesDir)), 'utf8'));
```

- [ ] **Step 3: Yanlış stub gövdelerini gerçek sözleşmeyle değiştir (F4)**

`frontend/e2e/integrated.spec.ts` başına import ekle:

```ts
import { loadContractFixture } from './contractFixtures';
```

`stubBrowserOnlyProviderReads` içindeki üç bloğu değiştir:

```ts
    if (method === 'GET' && path === '/portfolio/summary') {
      await route.fulfill({ json: loadContractFixture('portfolio-summary.json') });
      return;
    }

    if (method === 'GET' && path === '/portfolio/allocation') {
      await route.fulfill({ json: { bySector: [], byAsset: [], byCountry: [] } });
      return;
    }

    if (method === 'GET' && path === '/portfolio/performance') {
      await route.fulfill({ json: { period: '1M', series: [], metrics: { sharpe: null, maxDrawdown: null } } });
      return;
    }
```

Allocation ve performance boş-ama-doğru-şekilli kalır; bu dosyadaki stub'lar yalnız sağlayıcı okumalarını keser, portföy değeri iddiası taşımaz.

- [ ] **Step 4: Seçicileri redesign arayüzüne güncelle (F5)**

Watchlist testinde:

```ts
    await page.getByPlaceholder('AAPL, MSFT...').fill('msft');
    await page.getByRole('button', { name: 'Add symbol' }).click();
```

Portföy oluşturma testinde (`fill` + `click` satırlarının yerine):

```ts
    await page.getByRole('button', { name: 'Portföy oluştur' }).first().click();
    await page.getByPlaceholder('Growth, Income, Hedge...').fill('Growth E2E');
    await page.getByRole('button', { name: 'Portföy oluştur' }).last().click();
```

Kaynaklar: `WatchlistsView.tsx:293,302`, `PortfolioManagerView.tsx:527,780,803`.

- [ ] **Step 5: Bayat-UI çakışma senaryosunu ekle (Review Focus 5)**

`test.describe('integrated system smoke', ...)` bloğunun sonuna:

```ts
  test('shows the backend conflict when a portfolio gained holdings after the page loaded', async ({ page, request }) => {
    const createResponse = await request.post(`${API_BASE}/portfolios`, {
      data: { name: 'Stale E2E', baseCurrency: 'USD' },
    });
    expect(createResponse.ok()).toBe(true);
    const created = await createResponse.json() as { id: number };

    await page.goto(`/portfolio/${created.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Stale E2E' })).toBeVisible();

    // Another client buys into the portfolio after this page rendered it as empty.
    const buyResponse = await request.post(`${API_BASE}/portfolios/${created.id}/transactions`, {
      data: {
        symbol: 'MSFT',
        assetType: 'US_STOCK',
        action: 'BUY',
        quantity: 1,
        price: 320,
        currency: 'USD',
        tradeDate: '2026-07-09',
        source: 'MANUAL',
      },
    });
    expect(buyResponse.ok()).toBe(true);

    await page.getByRole('button', { name: 'Portföyü sil' }).first().click();
    await page.getByRole('button', { name: 'Portföyü sil' }).last().click();

    await expect(page.getByText('Portfolio cannot be deleted while it has active holdings')).toBeVisible();

    const portfolios = await (await request.get(`${API_BASE}/portfolios`)).json() as Array<{ id: number }>;
    expect(portfolios.map((portfolio) => portfolio.id)).toContain(created.id);
  });
```

Bu test backend 409 gövdesini (S8 şekli) gerçek HTTP üzerinden tarayıcıya kadar taşır. Silme butonu modalda devre dışı kalırsa (`Sell or transfer all holdings before deleting this portfolio.` görünürse) frontend sayfa açıkken holdings'i yeniden çekiyor demektir; bu durumda senaryo geçersizdir — testi silme, bulguyu rapora yaz ve kullanıcıya sor.

- [ ] **Step 6: Entegre paketi çalıştır**

Run: `npm run e2e:integrated`
Expected: 4 integrated test PASS (`chromium-desktop-1280` projesinde; diğer projeler tasarım gereği skip). Mock'lu `smoke.spec.ts` bu modda skip edilir.

- [ ] **Step 7: Mock'lu E2E'nin etkilenmediğini doğrula**

Run: `npm run e2e`
Expected: Task 1 taban çizgisiyle aynı sonuç.

- [ ] **Step 8: Commit**

```bash
git add frontend/e2e/contractFixtures.ts frontend/e2e/integrated.spec.ts
git commit -m "test(frontend): repair integrated e2e for redesigned UI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Entegre E2E'yi CI'da çalıştır ve doğrulama sözleşmesini güncelle

**Files:**
- Modify: `.github/workflows/ci.yml` (yeni job `frontend-integrated-e2e`)
- Modify: `docs/agent/verification.md` (Runtime Commands tablosu + Tests Required by Change Type)

**Interfaces:**
- Consumes: Task 5 yeşil `npm run e2e:integrated`
- Produces: PR'larda zorunlu `frontend-integrated-e2e` kontrolü

- [ ] **Step 1: Job'u ekle**

`.github/workflows/ci.yml` içinde `frontend-ci` job'undan sonra:

```yaml
  frontend-integrated-e2e:
    name: frontend-integrated-e2e
    runs-on: ubuntu-latest
    env:
      DB_NAME: financedb
      DB_USERNAME: finance_user
      DB_PASSWORD: ci_only_not_secret
      DB_HOST: localhost
      DB_PORT: '5433'
      REDIS_HOST: localhost
      REDIS_PORT: '6379'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Cache Maven dependencies
        uses: actions/cache@v4
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('backend/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Start PostgreSQL and Redis
        # compose references env_file .env for other services; an empty file is enough here.
        run: |
          touch .env
          docker compose up -d --wait postgres redis

      - name: Start backend
        working-directory: backend
        run: |
          chmod +x ./mvnw
          nohup ./mvnw -B --no-transfer-progress spring-boot:run > ../backend-e2e.log 2>&1 &

      - name: Wait for backend health
        run: |
          for attempt in $(seq 1 60); do
            if curl -fsS http://localhost:8080/actuator/health; then exit 0; fi
            sleep 5
          done
          cat backend-e2e.log
          exit 1

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps chromium

      - name: Run integrated E2E against the real backend
        working-directory: frontend
        run: npm run e2e:integrated

      - name: Upload integrated E2E artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: frontend-integrated-e2e-artifacts
          path: |
            frontend/playwright-report/
            frontend/test-results/
            backend-e2e.log
          if-no-files-found: warn
```

`DB_PASSWORD` yalnız CI'da geçici bir container için kullanılan, sır olmayan bir değerdir. Hiçbir sağlayıcı anahtarı tanımlanmaz; sağlayıcı okumaları `integrated.spec.ts` içinde tarayıcı sınırında stub'lanır.

- [ ] **Step 2: Workflow sözdizimini ve Compose'u doğrula**

Run (repo kökü): `docker compose config --quiet` ve `npx --yes yaml-lint .github/workflows/ci.yml` (araç yoksa `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`)
Expected: çıktı yok / hata yok.

- [ ] **Step 3: `verification.md`'yi güncelle**

Runtime Commands tablosuna `Frontend E2E` satırından sonra:

```markdown
| Frontend integrated E2E | `frontend/` | `npm run e2e:integrated` with PostgreSQL, Redis and the backend running (`docker compose up -d postgres redis`, then backend `spring-boot:run`); required when frontend↔backend contracts, persistence flows or error handling change. Its global setup truncates and seeds the local database. |
```

Tests Required by Change Type tablosuna:

```markdown
| Backend response DTO or frontend API type used by both runtimes | Update the matching file in `docs/contracts/fixtures/`, the backend `ContractFixtures.assertSameShape` test, and the frontend `src/api/contract.test.ts` schema in the same change |
```

"CI also runs ..." paragrafındaki listeye "frontend integrated E2E against a real backend" ekle.

- [ ] **Step 4: Commit ve CI kanıtı**

```bash
git add .github/workflows/ci.yml docs/agent/verification.md
git commit -m "chore(infra): run integrated frontend e2e against real backend" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Push ve PR açmak kullanıcı onayı gerektirir. PR açıldığında `frontend-integrated-e2e` job'unun sonucunu kontrol et; backend CI'da açılmazsa `backend-e2e.log` artifact'ındaki ilk hatayı rapora yaz (ör. data-service veya Mongo bağlantısının açılışı engellemesi) ve job'u `continue-on-error` ile gizleme.

---

## Son doğrulama (tüm görevlerden sonra, taze çıktıyla)

- [ ] `backend/`: `.\mvnw.cmd test` → `BUILD SUCCESS`
- [ ] `frontend/`: `npm run lint`, `npm run test:coverage`, `npm run build`, `npm run e2e` → hepsi geçer
- [ ] `frontend/`: `npm run e2e:integrated` (yerel backend ile) → geçer
- [ ] Repo kökü: `docker compose config --quiet` → hata yok
- [ ] Smoke S8 (verification.md): çalışan backend'de `curl -s -X DELETE http://localhost:8080/api/v1/portfolios/<holdings içeren id>` ve `curl -s http://localhost:8080/api/v1/does-not-exist` → gövde tam olarak `timestamp,status,error,message,path`
- [ ] Smoke S4/S5: entegre E2E watchlist ve journal testleri restart öncesi kalıcılığı kapsar; restart sonrası için verification.md S4/S5 adımlarını elle çalıştır
- [ ] `git diff main --stat` yalnız bu planın Files listelerindeki dosyaları içerir; redesign değişiklikleri karışmamıştır
- [ ] Teslim raporu: değişen dosyalar, çalıştırılan komutlar ve sonuçları, çalıştırılmayan kontroller, kalan risk (aşağıda)

## Kapsam dışı ve kalan risk

- Sözleşme fixture'ları şimdilik dört yanıtı kapsar. Watchlist research snapshot, journal sayfası, holdings ve agent-analysis (snake_case `from_cache`) aynı kalıpla eklenmelidir; ayrı iş olarak açılır.
- Frontend tipleri hâlâ elle yazılır; `docs/openapi.yaml`'dan tip üretimi daha kalıcı bir çözümdür ama OpenAPI dosyasının güncelliği önce doğrulanmalıdır.
- `vite.config.ts` içindeki `/api` proxy'si varsayılan yapılandırmada kullanılmaz; `VITE_API_BASE_URL=/api/v1` ile devreye girer. CORS listesi (`WebConfig.java`) yalnız `localhost:5173` / `127.0.0.1:5173`'ü kabul eder; başka bir origin'den çalıştırma bu planın kapsamında değildir.
- Backend hata mesajları İngilizce, arayüz Türkçe. Mesajlar çevrilmeden gösterilir; yerelleştirme ayrı bir ürün kararıdır.
