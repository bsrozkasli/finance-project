# Decision: outbound RestTemplate timeouts

**Recorded:** 2026-10-27

**Decision input:** Delegated to the implementing agent. The product owner delegated engineering decisions to the implementing agent (see the 2026-10-22 decision record). The audit finding proposed 3 s connect and 10 s read timeouts.

**Scope:** The single shared outbound `RestTemplate` bean in `WebConfig`, used by backend adapters that call the data-service.
**State:** Closed for this contract. The follow-up option below is deferred.

## Disposition

1. **Chosen values.** Connect timeout 3 s, read timeout 60 s. The audit proposed 3 s / 10 s.
2. **Why 60 s.** The data-service bounds its LLM calls at 30 s and 45 s. A 10 s read timeout would cut off valid LLM-backed responses and report them as unavailable. 60 s leaves headroom above the 45 s bound while still ending a hung call.
3. **Configurable.** `data-service.http.connect-timeout` and `data-service.http.read-timeout`. Non-positive values are rejected at startup.
4. **One shared bean retained.** No second `RestTemplate` is introduced now.
5. **Failure behavior.** Timeouts surface as `ResourceAccessException`. Adapters report the data as unavailable under the existing degradation contract. No value is synthesized.
6. **No endpoint or DTO change.**

## Deferred follow-up

A separate LLM `RestTemplate` with a longer budget, plus a tighter default (closer to the audit's 10 s) for quote and profile calls. Revisit only after real latencies are measured.

## Cost if wrong

Too high: a hung quote or profile call can hold a request thread for up to 60 s before degrading to unavailable. Too low: slow LLM responses are reported as unavailable. Both are corrected by configuration alone, with no code, contract, or data change.
