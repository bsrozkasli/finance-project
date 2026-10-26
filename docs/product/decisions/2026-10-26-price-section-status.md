# Decisions: price section status on the watchlist research snapshot (fourth slice of the section status contract)

**Recorded:** 2026-10-26

**Decision input:** The product owner delegated the Backend/Architecture Lead decisions (OQ-5) to the implementing agent
and asked that every decision be recorded. This continues the
[provider failure slice](2026-10-26-provider-failure-status.md) (D-5: "the price section of the snapshot"). Legal,
data-rights, policy and recovery decisions (OQ-1, OQ-2, OQ-3, OQ-8) are not taken here.

**Scope:** `PRD-FR-007` and `PRD-FR-009` for the `price` section of `GET /api/v1/watchlists/{id}/research-snapshot`.
**State:** Accepted 2026-10-26.

## Finding

`PriceRefreshService.getFreshLatest` reads the newest stored price, then tries to refresh from the provider chain. A refresh
that throws is swallowed (`fetchAndPersist` returns an empty list), and the stored price is returned as the newest one.
The watchlist price section therefore reads `OK` with a price that may be days old, whether the provider failed, returned
nothing, or answered. The price carries its timestamp, but the section status says the data is current. The same method
feeds other consumers (open-trade valuation in `JournalTradeService`, `PortfolioDashboardController`, `PriceController`),
which have the same weakness; they are not changed here (D-4).

## D-1. Lookup result (additive)

1. `PriceRefreshService` gains a method that returns the price together with how it was obtained: `FRESH` (the provider
   answered with a row for the symbol, so the newest price comes from the refresh or is at least as new as it),
   `STORED_REFRESH_FAILED` (the provider call threw and only the stored price exists), `STORED_REFRESH_EMPTY` (the provider
   returned nothing usable and only the stored price exists), and `NONE_REFRESH_FAILED` / `NONE_REFRESH_EMPTY` (no price at
   all). Provider-side failure is told apart from "nothing returned" by the exception, not by message text.
2. `getFreshLatest` and `getFreshHistory` keep their signature and behavior. The new method reuses the same fetch and save
   code; there is no second fetch path.

## D-2. Section status

| Lookup result | Section status | Message |
|---|---|---|
| `FRESH` | `OK` | none |
| `STORED_REFRESH_FAILED` | `STALE`, price shown | "Provider refresh failed; showing the last stored price" |
| `STORED_REFRESH_EMPTY` | `STALE`, price shown | "Provider returned no newer price; showing the last stored price" |
| `NONE_REFRESH_FAILED` | `FAILED` | "Provider request failed" |
| `NONE_REFRESH_EMPTY` | `EMPTY` | "Provider returned no data" |

`STALE` here means that a refresh was attempted and could not confirm the price is current: it is consistent with the
meaning decided in the smart report record ("older than its freshness policy"), where the policy for this section is "the
refresh succeeded". No market-calendar logic is added. A price that is current only because the market is closed is shown as
`STALE` when the provider returned nothing newer; this is the conservative reading. Cost if wrong: weekend and holiday
views of symbols without a newer row read `STALE`.

## D-3. Contract and display

The snapshot JSON keeps every field. The price section already carries `data` with its `asOf`; a `STALE` section keeps its
data. The circuit breaker of the section is not involved (the price section has none today). The frontend already labels
`STALE` ("Eski veri"); this slice checks that a `STALE` price section still shows its price and date, and changes the UI only
if it hides the data.

## D-4. Out of this slice

Open-trade valuation (`JournalTradeService`), the portfolio dashboard and `PriceController` still use `getFreshLatest` and
can present a stored price as current after a failed refresh. They need their own contract decisions (a staleness field on
their responses), recorded as follow-ups. The data-service still sends no 429.

## Implementation rulings

Rulings made while coding are appended below as `R-n`.
