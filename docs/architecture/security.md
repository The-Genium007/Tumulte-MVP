# Security Architecture

This document describes the security architecture of the Tumulte platform, covering authentication, token storage, HTTP security, and sensitive data handling.

---

## Overview

Tumulte implements defense-in-depth security with multiple layers:

1. **Authentication**: Multi-provider OAuth + session management
2. **Token Storage**: Encrypted at-rest storage for OAuth tokens
3. **HTTP Security**: CORS, rate limiting, security headers
4. **Sensitive Data**: Comprehensive filtering and sanitization

All security mechanisms are designed for production environments with real user data and persistent storage.

---

## Authentication

### Authentication Guards

Tumulte uses two separate authentication guards:

| Guard | Type | Use Case |
|-------|------|----------|
| **web** | Session/Cookie | Frontend application (Nuxt) |
| **api** | Access Token | Foundry VTT module, webhooks |

**Session Guard** (`web`):
- Cookie-based authentication
- Redis-backed session storage (production)
- 7-day session expiry
- `httpOnly` flag prevents JavaScript access
- `secure` flag enforces HTTPS in production
- `sameSite: 'lax'` prevents CSRF attacks

**API Guard** (`api`):
- Bearer token authentication
- Used by external integrations (Foundry VTT)
- Tokens are generated per VTT connection
- Stored in `TokenRevocationList` for instant invalidation

### OAuth Providers

Tumulte supports two OAuth providers:

#### 1. Twitch OAuth

**Flow:**
1. User clicks "Login with Twitch"
2. Redirected to Twitch OAuth authorization endpoint
3. User grants permissions (scopes: `user:read:email`, `channel:read:polls`, `channel:manage:polls`, `user:read:chat`, `user:write:chat`, `moderator:manage:chat_messages`, `channel:read:redemptions`)
4. Twitch redirects to callback with authorization code
5. Backend exchanges code for access token + refresh token
6. Tokens encrypted and stored in `auth_providers` table
7. User authenticated via session cookie

**State Validation:**
- PKCE-like state parameter generated with secure random bytes
- Stored in session before redirect
- Validated using `timingSafeEqual` (constant-time comparison) to prevent timing attacks

**Token Refresh:**
- Automatic refresh when access token expires
- Exponential backoff on refresh failures
- After 3 consecutive failures, user must re-authenticate

#### 2. Google OAuth

**Flow:**
Similar to Twitch, with Google-specific scopes (`email`, `profile`).

**Use Case:**
- Primary authentication for non-Twitch users
- Email/password authentication also available

### Password Authentication

**Hashing:**
- Algorithm: Scrypt (NIST-recommended for password storage)
- Parameters:
  - `cost`: 16384 (2^14)
  - `blockSize`: 8
  - `parallelization`: 1
- Automatic rehashing on login if parameters change

**Password Requirements:**
- Minimum 8 characters
- No maximum length (frontend enforces 128 characters)
- No complexity requirements (length is more important)

**Validation:**
```typescript
import { scrypt } from '@adonisjs/core/hash'

// Hashing
const hashedPassword = await scrypt.make(plainPassword)

// Verification
const isValid = await scrypt.verify(hashedPassword, plainPassword)
```

### Brute Force Protection

**Mechanisms:**

1. **Rate Limiting** (via Redis):
   - 5 login attempts per 15 minutes per IP
   - 3 login attempts per 15 minutes per IP + email combination

2. **Exponential Lockout**:
   - After 5 failed attempts: 30-second lockout
   - After 10 failed attempts: 5-minute lockout
   - After 15 failed attempts: 1-hour lockout

3. **Lockout Tracking**:
   - Stored in Redis with TTL
   - Key format: `lockout:ip:{ip}` and `lockout:email:{email}`

**Example:**
```typescript
// Check lockout before processing login
const lockoutKey = `lockout:${ip}:${email}`
const attempts = await redis.get(lockoutKey)

if (attempts >= 5) {
  const ttl = await redis.ttl(lockoutKey)
  throw new TooManyRequestsException(`Locked out for ${ttl} seconds`)
}
```

---

## Token Storage

### OAuth Token Encryption

All OAuth tokens (Twitch access tokens, refresh tokens, Google tokens) are encrypted at rest using AdonisJS Encryption service.

**Encryption:**
- Algorithm: AES-256-CBC
- Key: Derived from `APP_KEY` environment variable
- Initialization Vector (IV): Randomly generated per encryption operation

**CRITICAL:** The `APP_KEY` must NEVER change in production. Changing the key renders all encrypted tokens unreadable, requiring all users to re-authenticate.

**Implementation:**
```typescript
import encryption from '@adonisjs/core/services/encryption'

// Encrypting
const encryptedToken = encryption.encrypt(plainToken)

// Decrypting
const plainToken = encryption.decrypt(encryptedToken)
```

**Database Storage:**
```typescript
// AuthProvider model
class AuthProvider extends BaseModel {
  @column({ serializeAs: null })
  public accessToken: string // Encrypted, NEVER exposed in API responses

  @column({ serializeAs: null })
  public refreshToken: string // Encrypted, NEVER exposed in API responses
}
```

### Token Exposure Prevention

**Model Serialization:**
- All token fields use `serializeAs: null`
- Tokens are automatically excluded when models are converted to JSON
- Frontend never receives token values

**API Responses:**
```json
// AuthProvider API response (tokens excluded)
{
  "id": "uuid",
  "provider": "twitch",
  "providerUserId": "12345",
  "createdAt": "2024-01-15T10:30:00Z"
  // accessToken and refreshToken are NOT present
}
```

### Automatic Token Refresh

**Twitch Token Refresh:**
- Scheduler runs every 1 hour (`AuthorizationExpiryScheduler`)
- Refreshes tokens expiring within 24 hours
- Tracks refresh failures per streamer
- After 3 consecutive failures, disables streamer authorization

**Failure Tracking:**
```typescript
// Streamer model
class Streamer extends BaseModel {
  @column()
  public tokenRefreshFailures: number

  @column()
  public authorizationStatus: 'active' | 'suspended' | 'revoked'
}
```

**Recovery:**
- User receives email notification after 2 failures
- After 3 failures, authorization status set to `suspended`
- User must re-authorize via OAuth flow

---

## HTTP Security

### CORS (Cross-Origin Resource Sharing)

**Default Policy:**
- Whitelist-only: Requests allowed only from `FRONTEND_URL`
- Credentials allowed (cookies, authorization headers)
- Preflight requests cached for 1 hour

**Exception:**
- Foundry VTT webhook endpoints (`/webhooks/foundry/*`) allow all origins
- These endpoints require API key authentication (no cookies)

**Configuration:**
```typescript
// config/cors.ts
{
  origin: (origin) => {
    if (origin === env.get('FRONTEND_URL')) return true
    if (origin?.startsWith('/webhooks/foundry')) return true
    return false
  },
  credentials: true,
  maxAge: 3600
}
```

### Security Headers Middleware

Applied to all responses via `app/middleware/security_headers_middleware.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` | Prevents XSS attacks |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS (production only) |
| `X-Frame-Options` | `DENY` (except `/overlay/*`: `SAMEORIGIN`) | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer exposure |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disables unnecessary browser APIs |

**Overlay Exception:**
- `/overlay/*` routes use `X-Frame-Options: SAMEORIGIN`
- Allows embedding in OBS Browser Source (same-origin as frontend)

### Rate Limiting

**Strategy:**
- Redis-backed distributed rate limiting
- Per-IP tracking (via `X-Forwarded-For` header with fallback to `socket.remoteAddress`)
- Per-endpoint configurable limits

**Limits by Endpoint Category:**

| Category | Limit | Window |
|----------|-------|--------|
| Registration | 3 requests | 60 seconds |
| Login | 5 requests | 60 seconds |
| Forgot Password | 3 requests | 60 seconds |
| Poll Operations | 20 requests | 60 seconds |
| Overlay Studio | 10 requests | 60 seconds |
| VTT Webhooks | 100 requests | 60 seconds |

**Failure Behavior:**
- If Redis is unavailable, rate limiting fails closed (blocks all requests)
- Returns HTTP 503 Service Unavailable
- Logs error to Sentry

**Implementation:**
```typescript
// Rate limiting middleware
export default class RateLimitMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const key = `ratelimit:${ctx.request.ip()}:${ctx.route?.pattern}`
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, 60)
    }

    if (count > 20) {
      throw new TooManyRequestsException('Rate limit exceeded')
    }

    await next()
  }
}
```

### Request ID Tracing

Every request receives a unique `X-Request-ID` header (UUIDv4):

**Benefits:**
- Correlate logs across multiple services
- Track requests through distributed systems
- Debug specific user issues

**Usage:**
```typescript
// Automatic injection in exception handler
logger.error('Request failed', {
  requestId: ctx.request.header('X-Request-ID'),
  method: ctx.request.method(),
  url: ctx.request.url()
})
```

**Sentry Integration:**
- Request ID attached to all Sentry events as a tag
- Allows filtering Sentry issues by specific request

### Input Validation

**Validation Layer:**
- All endpoints validate input using Zod schemas
- Validation performed before business logic execution
- Returns HTTP 400 with detailed field-level errors

**Example:**
```typescript
import { z } from 'zod'

const createPollSchema = z.object({
  question: z.string().min(3).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(5),
  durationSeconds: z.number().int().min(30).max(3600)
})

// Validation in controller
const validated = createPollSchema.parse(ctx.request.body())
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "question",
      "message": "Question must be at least 3 characters",
      "code": "too_small"
    }
  ]
}
```

---

## Sensitive Data Handling

### Sentry Filtering

**Breadcrumb Filtering:**
- Passwords, tokens, API keys automatically redacted
- Regex-based detection: `/password|token|secret|key|bearer/i`
- Applied to all Sentry breadcrumbs before transmission

**Implementation:**
```typescript
// config/sentry.ts
beforeBreadcrumb(breadcrumb) {
  if (breadcrumb.data) {
    Object.keys(breadcrumb.data).forEach((key) => {
      if (/password|token|secret|key|bearer/i.test(key)) {
        breadcrumb.data[key] = '[FILTERED]'
      }
    })
  }
  return breadcrumb
}
```

### Support Reporter Sanitization

The frontend support reporter automatically sanitizes sensitive data before sending diagnostics.

**Sanitized Data:**
- Bearer tokens in HTTP headers
- JWT tokens in localStorage
- Passwords in form data
- API keys in environment variables
- Session cookies

**Implementation:**
```typescript
// utils/supportErrorMessages.ts
function sanitizeData(data: any): any {
  const sensitivePatterns = [
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    /jwt\s+[a-zA-Z0-9._-]+/gi,
    /"password":\s*"[^"]+"/gi,
    /"token":\s*"[^"]+"/gi
  ]

  let sanitized = JSON.stringify(data)
  sensitivePatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })

  return JSON.parse(sanitized)
}
```

### Generic Error Messages

**Production Behavior:**
- 5xx errors return generic messages ("Internal Server Error")
- 4xx errors return user-friendly messages (no system details)
- Prevents information leakage (email enumeration, database structure)

**Example:**
```typescript
// Exception handler (production)
if (error.status >= 500) {
  return ctx.response.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.'
  })
}

// Development: Full error details exposed
if (app.inDev) {
  return ctx.response.status(error.status).json({
    error: error.message,
    stack: error.stack,
    details: error.details
  })
}
```

**Email Enumeration Prevention:**
- Login/registration errors use the same message ("Invalid credentials")
- Timing attacks prevented via constant-time comparisons

---

## API Key Authentication (VTT)

Foundry VTT module authenticates using API keys instead of session cookies.

**Key Generation:**
- Generated when user pairs a VTT connection
- Format: `tumulte_{random_64_chars}`
- Stored hashed (SHA-256) in `vtt_connections` table

**Authentication Flow:**
```typescript
// VTT webhook request
POST /webhooks/foundry/dice-roll
Headers:
  Authorization: Bearer tumulte_abc123...
  X-VTT-Fingerprint: {browser_fingerprint}

// Backend validation
const apiKey = ctx.request.header('Authorization')?.replace('Bearer ', '')
const fingerprint = ctx.request.header('X-VTT-Fingerprint')

const connection = await VttConnection.findByApiKey(apiKey)

if (!connection || connection.fingerprint !== fingerprint) {
  throw new UnauthorizedException('Invalid API key or fingerprint')
}
```

**Revocation:**
- Instant invalidation via `TokenRevocationList`
- Revoked tokens checked on every request
- TTL: 30 days (cleanup via scheduler)

---

## Security Checklist

When deploying to production, ensure:

- [ ] `APP_KEY` is set to a secure random value (32+ characters)
- [ ] `APP_KEY` is backed up securely (changing it invalidates all tokens)
- [ ] `SESSION_DRIVER=redis` (not `cookie`)
- [ ] `NODE_ENV=production`
- [ ] HTTPS enforced (Nginx/reverse proxy)
- [ ] `FRONTEND_URL` set to actual production domain
- [ ] Twitch/Google OAuth redirect URIs match production URLs
- [ ] Database credentials are strong and unique
- [ ] Redis requires authentication (`requirepass` in redis.conf)
- [ ] Sentry DSN configured for error tracking
- [ ] Rate limiting Redis is separate from session Redis (optional but recommended)
- [ ] Security headers middleware enabled
- [ ] CORS whitelist contains only trusted domains

---

## Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| **XSS (Cross-Site Scripting)** | CSP headers, HTML escaping in templates, `httpOnly` cookies |
| **CSRF (Cross-Site Request Forgery)** | `sameSite: 'lax'` cookies, CORS whitelist, state parameter validation |
| **SQL Injection** | Lucid ORM parameterized queries, input validation |
| **Brute Force** | Rate limiting, exponential lockout, IP + email tracking |
| **Session Hijacking** | `httpOnly` + `secure` cookies, short session TTL (7 days) |
| **Token Theft** | Encrypted storage, `serializeAs: null`, HTTPS-only transmission |
| **Clickjacking** | `X-Frame-Options: DENY` (except overlays) |
| **MIME Sniffing** | `X-Content-Type-Options: nosniff` |
| **Information Leakage** | Generic error messages, Sentry filtering, support sanitization |
| **Timing Attacks** | `timingSafeEqual` for state/token comparisons |

---

## Future Enhancements

- **Multi-Factor Authentication (MFA)**: TOTP support for high-value accounts
- **API Rate Limiting by User**: Currently per-IP only
- **Content Security Policy Reports**: Monitor CSP violations via report-uri
- **Subresource Integrity (SRI)**: For third-party scripts (Nuxt UI, Tailwind CDN)
- **Security Audits**: Annual third-party penetration testing
- **Bug Bounty Program**: Community-driven security testing

---

## Related Documentation

- [Error Handling](../guides/error-handling.md)
- [Monitoring](../guides/monitoring.md)
- [API Reference](../api/reference.md)
