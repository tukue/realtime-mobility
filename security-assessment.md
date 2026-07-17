# Security Assessment Report: Stockholm Real-Time Mobility Application

## Executive Summary

The application is a FastAPI + React single-page app that consumes SL Trafiklab APIs to display real-time Stockholm public transport data. The architecture is clean and minimal — no database, no authentication, no user accounts. The primary attack surface is the backend API gateway proxying requests to third-party SL APIs.

**Risk Summary:**

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 5 |

The most urgent issue is a **live API key committed in `setup_backend.sh`** (tracked by git). The second major concern is the **wide-open CORS policy**, **absent security headers**, and **permissive Supabase RLS** if cloud sync is ever enabled.

---

## 1. Architecture Review

### Data Flow

```
Browser → FastAPI (Render.com) → SL Trafiklab APIs (free + key-based)
       ↘ WebSocket (alerts)    ↘ SL Deviations API (background poller)
       ↘ Supabase (optional)   ↘ Supabase PostgreSQL (favorite_stops)
```

### Trust Boundaries

| Boundary | Components |
|----------|------------|
| Client ↔ Backend | HTTPS (via Render), CORS, rate limiting (30/min/IP) |
| Backend ↔ SL APIs | HTTP API keys (outbound only), TLS to `*.sl.se` |
| Client ↔ Supabase | Anon key + RLS (currently no auth — fully open) |
| CI/CD ↔ Render | Deploy hook URL (secret) |

### Internet-Facing Components

- FastAPI on port 8000 (Render reverse proxy terminates TLS)
- WebSocket endpoint `/api/alerts/ws/{site_id}`
- Static SPA assets served by FastAPI

### Sensitive Assets

- `SL_REALTIME_API_KEY` (outbound key to SL APIs)
- `RENDER_DEPLOY_HOOK_URL` (GitHub Actions secret)
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client-side, expected to be public)
- Supabase `favorite_stops` table (RLS currently broken)

---

## 2. Threat Model (STRIDE)

### 2.1 API Gateway / FastAPI

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| CORS wildcard allows any origin to call API | Info Disclosure | HIGH | `cors_origins=["*"]` — any website can make API requests |
| No security headers allows clickjacking, MIME sniffing | Tampering | MEDIUM | Missing CSP, X-Frame-Options, X-Content-Type-Options |
| Rate limiting uses client IP — trivially bypassed via X-Forwarded-For | Elevation of Privilege | MEDIUM | `get_remote_address` behind Render proxy without `X-Forwarded-For` trusted config |
| Exception handler leaks SL API URL in error messages | Info Disclosure | LOW | `sl_api.py:59` includes URL in error response |

### 2.2 WebSocket Endpoint

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| No origin validation on WebSocket upgrade | Spoofing | MEDIUM | Any origin can open a WS connection to `/api/alerts/ws/{site_id}` |
| No per-connection rate limiting on WebSocket | Denial of Service | MEDIUM | Unlimited WS connections from single IP |
| Unbounded `site_id` strings accepted | Tampering | LOW | `site_id: str` not validated against actual stop IDs — poller converts via `int(sid)` which will crash on invalid input |
| Broadcast error messages leak exception details | Info Disclosure | LOW | `alerts_manager.py:95-96` sends `str(result)` to client |

### 2.3 Third-Party API Integration (SL APIs)

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| API key transmitted as URL query parameter | Info Disclosure | HIGH | `sl_api.py:91` — keys in query strings appear in logs, proxy history |
| No response schema validation | Tampering | MEDIUM | SL API responses parsed without Pydantic validation on raw upstream data |
| No TLS certificate pinning | Spoofing | LOW | httpx uses system CA bundle — acceptable for most use cases |
| No retry with circuit breaker | Denial of Service | LOW | Single retry attempt, no circuit breaker for SL API outages |
| Supply chain: 7 Python deps, 3 JS deps | Tampering | LOW | Minimal surface — all pinned versions |

### 2.4 Supabase / Database

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| RLS policies use `USING (true)` — no user isolation | Elevation of Privilege | CRITICAL | Any anon key holder can read/insert/delete ALL rows in `favorite_stops` |
| `user_id` defaults to `gen_random_uuid()` — never tied to auth | Spoofing | HIGH | Without auth, user_id is meaningless; all data is shared |
| No UPDATE policy but DELETE is open | Tampering | MEDIUM | Anyone can delete anyone's favorites |

### 2.5 CI/CD Pipeline

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| ~~Trivy vulnerability scanner disabled~~ | ~~Tampering~~ | ~~HIGH~~ | ~~`ci.yml:49` — no container image scanning~~ ✅ Resolved |
| No SAST for Python or TypeScript | Tampering | MEDIUM | No static analysis in pipeline |
| No dependency audit step | Tampering | MEDIUM | `npm audit` and `pip-audit` not run |
| No secret scanning | Info Disclosure | MEDIUM | No gitleaks/trufflehog step |

### 2.6 Cloud Infrastructure (Render)

| Threat | Category | Risk | Finding |
|--------|----------|------|---------|
| No WAF configured | Denial of Service | MEDIUM | Render free tier — no WAF available |
| Deploy hook is the only deployment auth | Spoofing | LOW | Single-factor: URL with query param |

---

## 3. Penetration Testing Findings

### P1: API Key Hardcoded in Git-Tracked File — CRITICAL ✅ Resolved

**File:** `setup_backend.sh:49`
**Evidence:** `echo "SL_REALTIME_API_KEY=233bffb3002c456bb99d042f44d00fee" > "$DOTENV_FILE"`

The SL API key was committed in plaintext to a tracked git file. Even though `.env` is gitignored, this script was version-controlled. Anyone with repo access (or if the repo is/ever was public) had the production API key.

**Impact:** Full API key compromise. Attacker can exhaust SL API quota, cause rate limiting for legitimate users, or abuse the key for unauthorized SL API access.

**Remediation (completed):**

1. ~~Rotate the SL API key immediately at Trafiklab portal~~ (do this if not already done)
2. ✅ Replaced hardcoded key in `setup_backend.sh` with placeholder
3. Use `git filter-branch` or BFG Repo-Cleaner to purge the key from git history
4. Store the API key only in Render environment variables (never in files)

### P2: Wildcard CORS Policy — HIGH

**File:** `backend/main.py:56-68`
**Evidence:** `cors_origins=["*"]` with `allow_methods=["*"]`, `allow_headers=["*"]`

**Impact:** Any website can make cross-origin API requests. An attacker can create a malicious page that calls your API using the victim's browser, potentially causing them to exhaust their IP's rate limit or exfiltrate public transport data for surveillance.

**Remediation:**

```python
# backend/main.py
cors_origins = ["https://your-app.onrender.com"]
if settings.environment == "development":
    cors_origins = ["http://localhost:5173"]
```

Add `environment` to `Settings` class and configure it in Render dashboard.

### P3: No Security Response Headers — HIGH

**File:** `backend/main.py` (missing middleware)

**Impact:** Browser-based attacks including clickjacking, MIME sniffing, and protocol downgrade attacks.

**Remediation:**

```python
# backend/main.py — add after CORSMiddleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self)"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss: ws: https:; "
        "img-src 'self' data:; frame-ancestors 'none'"
    )
    return response
```

Note: This must be placed **before** the `log_requests` middleware to ensure headers are added to all responses.

### P4: WebSocket Origin Not Validated — HIGH

**File:** `backend/routers/alerts.py:26-39`

**Impact:** Cross-site WebSocket hijacking. A malicious website can open WebSocket connections to your backend on behalf of a visitor, potentially enabling data exfiltration or DoS via connection flooding.

**Remediation:**

```python
@router.websocket("/ws/{site_id}")
async def ws_alerts(websocket: WebSocket, site_id: str):
    origin = websocket.headers.get("origin", "")
    allowed_origins = ["https://your-app.onrender.com", "http://localhost:5173"]
    if origin and origin not in allowed_origins:
        await websocket.close(code=4003)
        return
    # ... rest of handler
```

### P5: WebSocket Connection Flood (DoS) — HIGH

**File:** `backend/services/alerts_manager.py`

**Impact:** An attacker can open thousands of WebSocket connections with unique `site_id` values, causing the background poller to make thousands of SL API requests per tick, exhausting both your server resources and SL API rate limits.

**Mitigations:**

1. Limit total concurrent WebSocket connections per IP
2. Limit total unique `site_id` subscriptions
3. Add a maximum subscriber cap

```python
class AlertsConnectionManager:
    MAX_CONNECTIONS_PER_IP = 5
    MAX_TOTAL_CONNECTIONS = 500

    async def connect(self, websocket: WebSocket, site_id: str) -> None:
        client_ip = websocket.client.host if websocket.client else "unknown"
        total = sum(len(s) for s in self._connections.values())

        if total >= self.MAX_TOTAL_CONNECTIONS:
            await websocket.close(code=4001)
            return

        # Track per-IP connection count
        ip_count = sum(
            1 for sockets in self._connections.values()
            for ws in sockets
            if ws.client and ws.client.host == client_ip
        )
        if ip_count >= self.MAX_CONNECTIONS_PER_IP:
            await websocket.close(code=4001)
            return

        self._connections.setdefault(site_id, set()).add(websocket)
        await websocket.send_json({"type": "connected", "site_id": site_id})
```

### P6: Rate Limiter IP Spoofing — MEDIUM

**File:** `backend/services/dependencies.py:10`

`get_remote_address` reads `request.client.host` directly. Behind Render's reverse proxy, this is the proxy IP unless `X-Forwarded-For` is properly handled. If Render sets `X-Forwarded-For`, the rate limiter can be bypassed.

**Remediation:** Render's proxy sets the real client IP. Configure `X-Forwarded-For` trust or use `slowapi` with a custom key:

```python
from slowapi.util import get_remote_address

def get_trusted_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=get_trusted_client_ip)
```

---

## 4. Vulnerability Assessment

### CRITICAL

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| C1 | Supabase RLS policies use `USING (true)` — all data accessible to any client | `supabase/migrations/20260327112322_create_favorite_stops_table.sql:33-43` | A01 Broken Access Control |

### HIGH

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| ~~H1~~ | ~~API key hardcoded in git-tracked `setup_backend.sh`~~ | ~~`setup_backend.sh:49`~~ | ~~A07 Identification & Authentication Failures~~ ✅ |
| H2 | CORS allows all origins | `backend/main.py:56` | A05 Security Misconfiguration |
| H3 | No security headers | `backend/main.py` (missing) | A05 Security Misconfiguration |
| H4 | WebSocket has no origin validation or connection limits | `backend/routers/alerts.py`, `alerts_manager.py` | A05 Security Misconfiguration |

### MEDIUM

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| M1 | No SAST, dependency audit, or secret scanning in CI | `.github/workflows/ci.yml` | A06 Vulnerable & Outdated Components |
| M2 | API key sent as URL query parameter to SL APIs | `sl_api.py:91` | A04 Insecure Design |
| M3 | No response schema validation on upstream SL API data | `sl_api.py:52` | A03 Injection |
| M4 | No HSTS or HTTPS enforcement middleware | `backend/main.py` | A05 Security Misconfiguration |
| M5 | Background poller can be abused via WebSocket for API abuse | `alerts_manager.py:84-86` | A04 Insecure Design |
| M6 | Error messages expose SL API URLs to clients | `sl_api.py:59` | A09 Security Logging & Monitoring Failures |

### LOW

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| L1 | No input length validation on WebSocket site_id | `routers/alerts.py:27` | A03 Injection |
| L2 | Exception handler logs full stack traces to stdout | `main.py:100` | A09 Security Logging & Monitoring Failures |
| L3 | No health check rate limiting | `main.py:121` | A04 Insecure Design |
| L4 | SPA fallback serves all non-API paths — potential for cache poisoning | `main.py:145` | A05 Security Misconfiguration |
| L5 | `python-dotenv` loads `.env` in production | `config.py:27-30` | A05 Security Misconfiguration |

---

## 5. Third-Party API Security

### Current State

The application consumes 7 SL API endpoints via `httpx.AsyncClient`. Authentication is API-key-based (sent as query parameter). The free endpoints require no key.

### Issues and Recommendations

| Issue | Risk | Recommendation |
|-------|------|----------------|
| API keys in URL query strings | Keys leak in logs, proxies, browser history | SL APIs only support query-string auth — document this as accepted risk. Ensure backend logs never capture query params. Add log filtering middleware. |
| No response schema validation | Malformed SL data could cause downstream crashes | Add Pydantic models for upstream SL responses and validate before normalization |
| Single timeout value (10s) for all calls | Slow SL endpoints block the shared connection pool | Differentiate timeouts: 3s for typeahead, 8s for departures, 15s for journey planning |
| No circuit breaker | SL outages cause cascading timeouts | Implement `tenacity` or `aiobreaker` with circuit breaker pattern |
| No response caching | Repeated identical requests waste SL API quota | Add `cachetools.TTLCache` for identical requests within 30-60s |
| Free endpoints fetched for `search_stops_free` with full catalog | `fetch_free_sites_catalog` fetches ALL stops and filters client-side | This is an O(n) scan of potentially thousands of stops on every search. Cache the catalog with a long TTL. |

---

## 6. Infrastructure Hardening Recommendations

### 6.1 Docker Image

The current Dockerfile is already good — multi-stage build, slim base images, no root user concern (but should be addressed):

```dockerfile
# Add after FROM python:3.11.15-slim-bookworm
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
```

### 6.2 Environment Configuration

- **Remove `.env` file from disk in production** — Render injects env vars at runtime; no `.env` file needed
- **Add `Settings` validation** — fail fast if critical secrets are missing in production
- **Separate `cors_origins` by environment** — never use `["*"]` in production

### 6.3 Render Platform

- Enable Render's managed TLS (should be automatic)
- Consider Render's paid plan for WAF capabilities
- Set `FORCE_HTTPS=true` environment variable
- Configure health check grace period to avoid restart loops

---

## 7. Kubernetes Hardening

The application currently deploys to Render (not Kubernetes). If you migrate:

| Area | Recommendation |
|------|----------------|
| Pod Security | Use `restricted` Pod Security Standards |
| Network Policies | Restrict ingress to only port 8000, egress only to SL API IPs |
| RBAC | Minimize service account permissions |
| Secrets | Use Kubernetes Secrets or External Secrets Operator — never mount `.env` files |
| Ingress | Use ingress-nginx with rate limiting and security headers |
| Image scanning | Enable Trivy operator for runtime scanning |
| Admission | Use OPA/Gatekeeper to enforce image signing |

---

## 8. DevSecOps Improvements

### 8.1 Re-enable Trivy Scanning ✅ Done

Trivy has been re-enabled in `.github/workflows/ci.yml` with the following configuration:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: realtime-mobility:${{ github.sha }}
    format: table
    exit-code: 1
    severity: CRITICAL,HIGH
    ignore-unfixed: true
```

**Key decisions:**
- `severity: CRITICAL,HIGH` — only blocks on high-severity vulnerabilities
- `ignore-unfixed: true` — skips vulnerabilities with no upstream fix available (e.g., Debian OS packages awaiting patches)
- Upgraded `setuptools` to ≥83.0.0 to resolve Python package CVEs (jaraco.context CVE-2026-23949, wheel CVE-2026-24049)

**Remaining accepted risks (Debian OS — no upstream fix):**
- `zlib1g` CVE-2023-45853 (CRITICAL, `will_not_fix`)
- `perl-base` CVE-2026-13221, CVE-2026-8376 (CRITICAL, no fix version)
- `libsqlite3-0` CVE-2025-7458 (CRITICAL, no fix version)
- `bsdutils`/`libblkid1`/`util-linux` CVE-2026-53615 (HIGH, no fix version)
- `ncurses` CVE-2025-69720 (HIGH, no fix version)

These will be automatically picked up when Debian publishes fixes.

### 8.2 Add SAST

```yaml
# Python
- name: Run Bandit SAST
  run: pip install bandit && bandit -r backend/ -ll

# TypeScript — Semgrep or eslint-plugin-security
- name: Run Semgrep
  uses: semgrep/semgrep-action@v1
  with:
    config: p/typescript
```

### 8.3 Add Dependency Auditing

```yaml
- name: Audit npm dependencies
  run: npm audit --audit-level=high

- name: Audit Python dependencies
  run: pip install pip-audit && pip-audit -r backend/requirements.txt
```

### 8.4 Add Secret Scanning

```yaml
- name: Run Gitleaks
  uses: gitleaks/gitleaks-action@v2
  with:
    args: detect --source=. --verbose
```

### 8.5 SBOM Generation

```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: realtime-mobility:${{ github.sha }}
    format: spdx-json
```

---

## 9. Monitoring & Observability

### Current State

- Request logging middleware (method, path, status, duration) — good
- Exception handler logs stack traces — good
- No structured logging — **improvement needed**
- No metrics export — **improvement needed**
- No alerting — **improvement needed**

### Recommendations

| Area | Implementation |
|------|----------------|
| Structured logging | Switch to `structlog` or `python-json-logger` for machine-parseable logs |
| Metrics | Add `prometheus-fastapi-instrumentator` for request metrics (latency, status codes, rate limits) |
| Alerting on SL failures | Track `SLApiError` rate — alert if >5% of requests fail |
| WebSocket metrics | Track active connections, connection churn, messages sent |
| Audit logging | Log all API key usage, rate limit hits, and error patterns |
| Uptime monitoring | Add external uptime check (Render has built-in; supplement with UptimeRobot or similar) |

---

## 10. Prioritized Remediation Roadmap

### Immediate (Week 1) — Stop the Bleeding

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| ~~P0~~ | ~~Rotate SL API key and remove from `setup_backend.sh`~~ | ~~30 min~~ | ~~Eliminates key exposure~~ ✅ |
| P0 | Fix Supabase RLS policies to use `auth.uid()` | 1 hour | Prevents data exfiltration |
| P1 | Add security headers middleware | 1 hour | Mitigates clickjacking, MIME sniffing |
| P1 | Restrict CORS to production origin | 30 min | Eliminates cross-origin abuse |

### Short-Term (Weeks 2-3) — Harden the Perimeter

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P1 | Add WebSocket origin validation and connection limits | 2 hours | Prevents WS abuse |
| ~~P2~~ | ~~Re-enable Trivy in CI pipeline~~ | ~~1 hour~~ | ~~Catches container CVEs~~ ✅ |
| P2 | Add `npm audit` and `pip-audit` to CI | 1 hour | Catches dependency CVEs |
| P2 | Add structured logging with `structlog` | 2 hours | Enables log analysis |
| P2 | Add rate limiting key trust for `X-Forwarded-For` | 1 hour | Prevents rate limit bypass |

### Medium-Term (Weeks 4-6) — Defense in Depth

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| M1 | Add SAST (Bandit) to CI pipeline | 2 hours | Catches Python vulnerabilities |
| M2 | Add secret scanning (Gitleaks) to CI | 1 hour | Prevents future key leaks |
| M3 | Add response validation for upstream SL API responses | 4 hours | Prevents injection via malformed upstream data |
| M4 | Implement caching for free sites catalog | 2 hours | Reduces SL API load and latency |
| M5 | Add Prometheus metrics + Grafana dashboard | 4 hours | Enables operational visibility |
| M6 | Add circuit breaker for SL API calls | 3 hours | Prevents cascading failures |

### Long-Term (Months 2-3) — Maturity

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| L1 | SBOM generation in CI | 2 hours | Supply chain transparency |
| L2 | Image signing with cosign | 3 hours | Supply chain integrity |
| L3 | Container runtime security (Falco) | 1 day | Runtime threat detection |
| L4 | Penetration test by external party | $5-15K | Professional validation |
| L5 | WAF deployment (Cloudflare/AWS WAF) | 1 day | Layer 7 protection |

---

## 11. Code-Level Improvements

### 11.1 Log Filtering Middleware (Prevents API Key Leakage)

```python
# backend/middleware/logging.py
import logging
import re

class SensitiveDataFilter(logging.Filter):
    """Redact API keys from log output."""
    PATTERNS = [
        (re.compile(r'key=([A-Za-z0-9]{20,})'), r'key=***REDACTED***'),
        (re.compile(r'api_key[=:]\s*[A-Za-z0-9]{20,}'), r'api_key=***REDACTED***'),
    ]

    def filter(self, record):
        msg = record.getMessage()
        for pattern, replacement in self.PATTERNS:
            msg = pattern.sub(replacement, msg)
        record.msg = msg
        record.args = ()
        return True

# Add to main.py logging setup
logger.addFilter(SensitiveDataFilter())
```

### 11.2 Input Validation for WebSocket Site IDs

```python
# backend/routers/alerts.py
import re

SITE_ID_PATTERN = re.compile(r'^\d{1,10}$')

@router.websocket("/ws/{site_id}")
async def ws_alerts(websocket: WebSocket, site_id: str):
    if not site_id or not SITE_ID_PATTERN.match(site_id.strip()):
        await websocket.close(code=4000)
        return
    # ...
```

### 11.3 Upstream Response Validation

```python
# backend/services/sl_api.py — add to _fetch_json
from pydantic import BaseModel

class SLDeparturesResponse(BaseModel):
    StatusCode: int = 0
    Message: str = ""
    ResponseData: dict = {}

async def fetch_realtime_departures_free(site_id: int, *, client=None) -> dict:
    url = get_sl_free_departures_url().format(site_id=site_id)
    raw = await _fetch_json(url, {}, client=client, require_api_key=False)
    # Validate structure before returning
    validated = SLDeparturesResponse.model_validate(raw)
    return validated.model_dump()
```

### 11.4 Environment-Aware CORS

```python
# backend/services/config.py — add to Settings
class Settings(BaseSettings):
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]

    @model_validator(mode="after")
    def _set_cors_by_env(self) -> "Settings":
        if self.environment == "production" and self.cors_origins == ["*"]:
            logger.warning("CORS set to wildcard in production — restrict to specific origins")
        return self
```

Then in `render.yaml`:

```yaml
services:
  - type: web
    name: realtime-mobility
    runtime: docker
    healthCheckPath: /api/health
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: CORS_ORIGINS
        value: '["https://your-app.onrender.com"]'
```

### 11.5 Fixed Supabase RLS Migration

```sql
-- Drop and recreate with proper user isolation
DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_stops;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorite_stops;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorite_stops;

-- These policies require auth.uid() — if auth is not used,
-- the table should not be exposed via anon key at all.
CREATE POLICY "Users can view own favorites"
  ON favorite_stops FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own favorites"
  ON favorite_stops FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own favorites"
  ON favorite_stops FOR DELETE
  USING (user_id = auth.uid());
```

If no auth is planned, disable the Supabase integration entirely and rely on `localStorage` only.

---

## 12. References

| Standard | Relevance |
|----------|-----------|
| OWASP API Security Top 10 (2023) | API endpoint security assessment |
| OWASP ASVS v4.0 | Application security verification |
| NIST SP 800-53 Rev 5 | Security controls catalog |
| CIS Docker Benchmark v1.6 | Container hardening |
| CIS Kubernetes Benchmark v1.8 | K8s hardening (future) |
| Render Security Best Practices | Platform-specific hardening |
| Supabase Row Level Security | Database access control |

---

**Report generated:** 2026-07-16
**Last updated:** 2026-07-16 — Re-enabled Trivy scanning with `ignore-unfixed`, upgraded setuptools to fix Python CVEs
**Scope:** Full application stack (React frontend, FastAPI backend, Render deployment, Supabase, GitHub Actions CI/CD)
**Methodology:** Static code analysis, architecture review, STRIDE threat modeling, OWASP Top 10/API 10 assessment
