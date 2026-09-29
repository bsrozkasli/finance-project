# AUTH_SPEC.md

> Status: Proposed
> Depends on: SPEC.md (all sections), AGENTS.md
> Affects: `backend/`, `frontend/`, `docker-compose.yml`, `.env.example`

---

## 1. Overview

This document specifies how authentication and per-user data isolation are added
to the Finance Project. The current system is local-demo only with no auth.
This spec introduces JWT-based stateless authentication through Spring Security,
user-scoped data ownership for all persisted domain objects, and the corresponding
frontend session flow.

**Out of scope for this spec:**
- OAuth2 / social login (Google, GitHub) — planned as a follow-up.
- Role-based authorization beyond `USER` and `ADMIN` — add when needed.
- Production secret management (Vault, AWS Secrets Manager) — covered in SECURITY.md.
- Mobile / native clients.

---

## 2. Architecture overview

```
Browser (React)
  │
  │  POST /api/v1/auth/register  ──► AuthController
  │  POST /api/v1/auth/login     ──► AuthController ──► UserDetailsService
  │                                                  ──► JwtService (sign)
  │◄── { accessToken, refreshToken }
  │
  │  GET /api/v1/portfolio/summary
  │  Authorization: Bearer <accessToken>
  │                                ──► JwtAuthenticationFilter
  │                                ──► SecurityContextHolder
  │                                ──► PortfolioController
  │                                ──► PortfolioUseCase (userId scoped)
```

Token strategy:
- **Access token**: short-lived JWT (15 minutes), stateless, validated on every request.
- **Refresh token**: long-lived (7 days), stored server-side in `refresh_tokens` table,
  rotated on every use (refresh token rotation).
- No session cookies. All auth is header-based (`Authorization: Bearer <token>`).

---

## 3. Domain model additions

### 3.1 New entities

#### `AppUser` (new domain model — framework-free)

```java
// backend/src/main/java/.../domain/model/AppUser.java
public final class AppUser {
    private final Long id;
    private final String email;          // unique, lowercase-normalized
    private final String passwordHash;   // bcrypt, never plain-text
    private final String displayName;
    private final UserRole role;         // USER | ADMIN
    private final Instant createdAt;
    private final boolean enabled;

    // Invariant: email must be non-blank and contain @
    public AppUser(Long id, String email, String passwordHash,
                   String displayName, UserRole role, Instant createdAt, boolean enabled) {
        if (email == null || !email.contains("@")) throw new IllegalArgumentException("Invalid email");
        if (passwordHash == null || passwordHash.isBlank()) throw new IllegalArgumentException("Password hash required");
        // assign fields
    }
}
```

#### `RefreshToken` (new domain model)

```java
public final class RefreshToken {
    private final Long id;
    private final Long userId;
    private final String tokenHash;   // SHA-256 of raw token, never store raw
    private final Instant expiresAt;
    private final Instant createdAt;
    private final boolean revoked;
}
```

### 3.2 Existing models — add `userId` ownership

Every persisted domain object that is user-specific gains a `userId` field.
The field is `Long`, non-null after the migration, and indexed.

| Model | Table | Column added |
|---|---|---|
| `PortfolioPosition` | `portfolio_positions` | `user_id BIGINT NOT NULL` |
| `JournalTrade` | `journal_trades` | `user_id BIGINT NOT NULL` |
| `Watchlist` | `watchlists` | `user_id BIGINT NOT NULL` |
| `Asset` (tracked list) | `assets` | `user_id BIGINT NOT NULL` |
| `AgentAnalysisHistory` | `agent_analysis_history` | `user_id BIGINT NOT NULL` |

`PriceHistory`, `FundamentalSnapshot`, `FinancialStatement` are market data
shared across users and do not get `user_id`.

---

## 4. New ports

Add these ports to `domain/port/outbound/`:

```java
// UserRepositoryPort.java
public interface UserRepositoryPort {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findById(Long id);
    AppUser save(AppUser user);
    boolean existsByEmail(String email);
}

// RefreshTokenPort.java
public interface RefreshTokenPort {
    RefreshToken save(RefreshToken token);
    Optional<RefreshToken> findByTokenHash(String hash);
    void revokeAllForUser(Long userId);
    void revokeByTokenHash(String hash);
    void deleteExpired();   // called by scheduled cleanup job
}
```

---

## 5. New use cases

Register and wire through `DomainConfig.java` — no Spring annotations on these classes.

### 5.1 `RegisterUseCase`

```java
public class RegisterUseCase {
    // Ports injected via constructor
    private final UserRepositoryPort userRepo;
    private final PasswordEncoder passwordEncoder;  // port interface, bcrypt adapter

    public AppUser execute(String email, String rawPassword, String displayName) {
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepo.existsByEmail(normalizedEmail))
            throw new EmailAlreadyTakenException(normalizedEmail);
        String hash = passwordEncoder.encode(rawPassword);
        AppUser user = new AppUser(null, normalizedEmail, hash, displayName,
                                   UserRole.USER, Instant.now(), true);
        return userRepo.save(user);
    }
}
```

### 5.2 `LoginUseCase`

```java
public class LoginUseCase {
    private final UserRepositoryPort userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtPort jwtPort;
    private final RefreshTokenPort refreshTokenPort;

    public TokenPair execute(String email, String rawPassword) {
        AppUser user = userRepo.findByEmail(email.trim().toLowerCase())
            .orElseThrow(() -> new InvalidCredentialsException());
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash()))
            throw new InvalidCredentialsException();  // same exception — no user enumeration
        if (!user.isEnabled())
            throw new AccountDisabledException();

        String accessToken = jwtPort.generateAccessToken(user);
        RefreshToken refreshToken = jwtPort.generateRefreshToken(user);
        refreshTokenPort.save(refreshToken);
        return new TokenPair(accessToken, refreshToken.getRawToken());
    }
}
```

### 5.3 `RefreshUseCase`

```java
public class RefreshUseCase {
    public TokenPair execute(String rawRefreshToken) {
        String hash = Sha256.hash(rawRefreshToken);
        RefreshToken stored = refreshTokenPort.findByTokenHash(hash)
            .orElseThrow(() -> new InvalidTokenException());
        if (stored.isRevoked() || stored.getExpiresAt().isBefore(Instant.now()))
            throw new InvalidTokenException();

        // Rotate: revoke old, issue new pair
        refreshTokenPort.revokeByTokenHash(hash);
        AppUser user = userRepo.findById(stored.getUserId()).orElseThrow();
        String newAccess = jwtPort.generateAccessToken(user);
        RefreshToken newRefresh = jwtPort.generateRefreshToken(user);
        refreshTokenPort.save(newRefresh);
        return new TokenPair(newAccess, newRefresh.getRawToken());
    }
}
```

---

## 6. New port: `JwtPort`

```java
// domain/port/outbound/JwtPort.java
public interface JwtPort {
    String generateAccessToken(AppUser user);
    RefreshToken generateRefreshToken(AppUser user);  // returns domain model with raw token
    Optional<Long> extractUserId(String token);       // returns empty if invalid/expired
    boolean isAccessTokenValid(String token);
}
```

Adapter: `adapter/security/JwtAdapter.java` — uses `io.jsonwebtoken:jjwt-api`.

JWT claims for access token:

```json
{
  "sub": "42",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1719568200,
  "exp": 1719569100
}
```

---

## 7. Spring Security configuration

### 7.1 Security filter chain

```java
// adapter/config/SecurityConfig.java  (Spring adapter — NOT in domain)
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/**",
                    "/actuator/health",
                    "/actuator/prometheus"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
            )
            .build();
    }
}
```

### 7.2 JWT authentication filter

```java
// adapter/security/JwtAuthenticationFilter.java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }
        String token = header.substring(7);
        jwtPort.extractUserId(token).ifPresent(userId -> {
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userId, null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER")));
            SecurityContextHolder.getContext().setAuthentication(auth);
        });
        chain.doFilter(request, response);
    }
}
```

### 7.3 Resolving the current user in controllers

Add a helper to extract `userId` from `SecurityContext`:

```java
// adapter/security/SecurityContextHelper.java
public class SecurityContextHelper {
    public static Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new UnauthenticatedException();
        return (Long) auth.getPrincipal();
    }
}
```

Controllers call `SecurityContextHelper.currentUserId()` and pass it to use cases.
Use cases scope all queries and mutations to that `userId`.

---

## 8. Auth endpoints

Add under `adapter/rest/AuthController.java`. All paths are under `/api/v1/auth/`
and are permit-all in the security filter chain.

| Method | Path | Request body | Response | Purpose |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `RegisterRequest` | `201 UserResponse` | Create account |
| `POST` | `/api/v1/auth/login` | `LoginRequest` | `200 TokenPairResponse` | Issue tokens |
| `POST` | `/api/v1/auth/refresh` | `RefreshRequest` | `200 TokenPairResponse` | Rotate tokens |
| `POST` | `/api/v1/auth/logout` | `RefreshRequest` | `204` | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | — | `200 UserResponse` | Current user info |

### Request / response shapes

```json
// RegisterRequest
{ "email": "user@example.com", "password": "s3cur3!", "displayName": "Alice" }

// LoginRequest
{ "email": "user@example.com", "password": "s3cur3!" }

// RefreshRequest
{ "refreshToken": "<raw-refresh-token>" }

// TokenPairResponse
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": 900
}

// UserResponse
{ "id": 42, "email": "user@example.com", "displayName": "Alice", "role": "USER" }
```

### Error responses (auth-specific)

| Status | Condition | `message` |
|---|---|---|
| `400` | Missing/blank field | `"email is required"` |
| `401` | Wrong credentials | `"Invalid email or password"` |
| `401` | Expired/invalid token | `"Token is invalid or expired"` |
| `409` | Email already registered | `"Email already in use"` |
| `423` | Account disabled | `"Account is disabled"` |

Use the standard error shape from SPEC.md section 8:
```json
{ "timestamp": "...", "status": 401, "error": "Unauthorized",
  "message": "Invalid email or password", "path": "/api/v1/auth/login" }
```

---

## 9. Database migrations

Create in order — never modify already-applied migrations.

### `V5__create_users.sql`
```sql
CREATE TABLE app_users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100),
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_email ON app_users(email);
```

### `V6__create_refresh_tokens.sql`
```sql
CREATE TABLE refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 hex
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

### `V7__add_user_id_to_owned_tables.sql`
```sql
-- Add user_id to all user-owned tables.
-- Default 1 is a temporary system user for existing local dev data.
-- Production must not have default data; this migration is dev-only safe.

ALTER TABLE portfolio_positions  ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE journal_trades       ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE watchlists           ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE assets               ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;
ALTER TABLE agent_analysis_history ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1;

-- Indexes for scoped queries
CREATE INDEX idx_portfolio_positions_user_id   ON portfolio_positions(user_id);
CREATE INDEX idx_journal_trades_user_id        ON journal_trades(user_id);
CREATE INDEX idx_watchlists_user_id            ON watchlists(user_id);
CREATE INDEX idx_assets_user_id                ON assets(user_id);
CREATE INDEX idx_agent_analysis_history_user_id ON agent_analysis_history(user_id);
```

---

## 10. User-scoped query changes

Every repository port method that returns user-owned data must accept `userId`.
Controllers resolve `userId` from `SecurityContextHelper` and pass it down.
Use cases must never query without a `userId` scope.

Examples:

```java
// Before
List<PortfolioPosition> findAll();

// After
List<PortfolioPosition> findAllByUserId(Long userId);
Optional<PortfolioPosition> findByIdAndUserId(Long id, Long userId);
```

Return `404` (not `403`) when a resource exists but belongs to a different user.
This prevents resource existence enumeration.

---

## 11. New environment variables

Add to `.env.example` and SPEC.md section 12:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | Required | none | HMAC-SHA256 signing key, min 32 chars, base64 |
| `JWT_ACCESS_TOKEN_EXPIRY_SECONDS` | Optional | `900` | Access token TTL (15 min) |
| `JWT_REFRESH_TOKEN_EXPIRY_DAYS` | Optional | `7` | Refresh token TTL |
| `AUTH_BCRYPT_STRENGTH` | Optional | `12` | bcrypt cost factor |

`JWT_SECRET` must never be committed, logged, or exposed to the frontend.
Generate with: `openssl rand -base64 48`

---

## 12. Frontend changes

### 12.1 Auth state

Add `AuthContext` to manage token lifecycle:

```typescript
// frontend/src/context/AuthContext.tsx
interface AuthState {
  accessToken: string | null;
  user: UserResponse | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
}
```

Store `accessToken` in memory only (never `localStorage` — XSS risk).
Store `refreshToken` in an `httpOnly` cookie set by the backend, OR in memory
with silent refresh on page reload via `/api/v1/auth/refresh`.

### 12.2 Axios interceptor

```typescript
// frontend/src/api/client.ts — add interceptors
client.interceptors.request.use(config => {
  const token = authStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await authStore.refresh();   // calls POST /auth/refresh, updates in-memory token
      return client(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 12.3 New pages / routes

| Route | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage.tsx` | Email + password form |
| `/register` | `RegisterPage.tsx` | Sign-up form |
| `/` (protected) | `Dashboard.tsx` | Existing dashboard, now auth-gated |

Add a `ProtectedRoute` wrapper that redirects to `/login` when no valid token
is present.

### 12.4 New API types

```typescript
// frontend/src/api/auth.ts
export interface RegisterRequest { email: string; password: string; displayName: string; }
export interface LoginRequest    { email: string; password: string; }
export interface TokenPairResponse { accessToken: string; refreshToken: string; expiresIn: number; }
export interface UserResponse    { id: number; email: string; displayName: string; role: string; }
```

---

## 13. CORS update

`WebConfig` currently permits the Vite origin for `/api/**`. After auth is added,
restrict to explicit allowed origins and add `Authorization` to allowed headers:

```java
registry.addMapping("/api/**")
    .allowedOrigins(allowedOrigins)   // from env, not wildcard
    .allowedMethods("GET","POST","PUT","DELETE","OPTIONS")
    .allowedHeaders("Authorization","Content-Type")
    .allowCredentials(true)
    .maxAge(3600);
```

---

## 14. Scheduled maintenance

Add `RefreshTokenCleanupJob` that calls `RefreshTokenPort.deleteExpired()` nightly:

```java
// adapter/scheduler/RefreshTokenCleanupJob.java
@Scheduled(cron = "0 0 3 * * *")   // 03:00 daily
public void cleanExpiredTokens() {
    refreshTokenPort.deleteExpired();
}
```

Register in `DomainConfig.java` following the existing `PriceIngestionJob` pattern.

---

## 15. Testing requirements

### Backend

| Test type | What to cover |
|---|---|
| Unit (`RegisterUseCase`) | Happy path; duplicate email throws `EmailAlreadyTakenException` |
| Unit (`LoginUseCase`) | Valid credentials return `TokenPair`; wrong password throws; disabled account throws |
| Unit (`RefreshUseCase`) | Valid rotation returns new pair; revoked token throws; expired token throws |
| Unit (`JwtAdapter`) | Token generation; valid extraction; expired token returns empty |
| `@WebMvcTest` (`AuthController`) | `POST /register` 201; duplicate 409; `POST /login` 200; wrong creds 401; `POST /refresh` 200; invalid refresh 401 |
| `@WebMvcTest` (existing controllers) | Request without `Authorization` returns 401; valid token passes through |
| Repository adapter | `UserJpaAdapter.findByEmail`; `RefreshTokenJpaAdapter.findByTokenHash`; revoke; deleteExpired |
| `@SpringBootTest` | Full register → login → access protected endpoint → refresh → logout flow |

### Frontend

- `AuthContext` unit test: login sets token; logout clears token; 401 triggers refresh.
- Axios interceptor test: attaches `Bearer` header; retries once on 401.
- `ProtectedRoute` test: redirects to `/login` when no token.

### Smoke scenario (add to AGENTS.md section 7)

| ID | Scenario | Request sequence | Pass condition |
|---|---|---|---|
| S9 | Full auth flow | Register → login → GET /portfolio/summary → POST /auth/refresh → logout | Each step returns expected status; after logout, refresh token is invalid (401) |
| S10 | Cross-user isolation | Register two users; user A creates watchlist; user B GET /watchlists | User B response does not contain user A's watchlist |

---

## 16. Definition of done (auth feature)

- [ ] `V5`, `V6`, `V7` migrations apply cleanly on a fresh database.
- [ ] All 5 auth endpoints return correct status codes and shapes.
- [ ] JWT access token expires in 15 minutes; refresh token rotates on use.
- [ ] All existing controllers return `401` without a valid token.
- [ ] `userId` scope is enforced in all repository queries for owned tables.
- [ ] Cross-user isolation verified by smoke scenario S10.
- [ ] `JWT_SECRET` is not logged, not committed, not exposed to frontend.
- [ ] Frontend silent refresh works: page reload does not force re-login within TTL.
- [ ] All backend tests pass: `./mvnw test`.
- [ ] Frontend lint and build pass: `npm run lint && npm run build`.
- [ ] SPEC.md section 12 updated with new env variables.
- [ ] `AGENTS.md` smoke table updated with S9 and S10.
- [ ] PR is reviewed and approved before merge to `main`.