# passfort

[![CI](https://github.com/tommyv1987/passfort/actions/workflows/ci.yml/badge.svg)](https://github.com/tommyv1987/passfort/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@tommyvez/passfort)](https://www.npmjs.com/package/@tommyvez/passfort)
[![npm downloads](https://img.shields.io/npm/dw/@tommyvez/passfort)](https://www.npmjs.com/package/@tommyvez/passfort)
[![License: MIT](https://img.shields.io/npm/l/@tommyvez/passfort)](LICENSE)

**Password [protection](https://www.passfort.net/) for Vercel deployments.** No $150/month required. Works on Hobby plan.

Protect your entire site or specific routes behind a password with a few lines of code.

## Quick Start

### 1. Install

```bash
pnpm add @tommyvez/passfort
# or: npm install @tommyvez/passfort
```

### 2. Add Middleware or Proxy (Next.js)

**Automated:** from your Next.js project root, run:

```bash
npx passfort init
```

This creates `middleware.ts` (or `src/middleware.ts` if you use `src/`) and wires up protection for the entire site. Options:

- `npx passfort init --paths=/admin,/dashboard` — protect only those paths
- `npx passfort init --block` — maintenance mode (503, no form)

**Manual (middleware):** run `npx passfort matcher` and paste the output into `middleware.ts`, or add:

```typescript
import { withPasswordProtect } from '@tommyvez/passfort/next';

export default withPasswordProtect({ protectAll: true });
// or: paths: ['/admin', '/preview'], for specific routes only

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
```

**Next 16+ (proxy):** Next.js 16 renamed middleware to [proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). Use `proxy.ts` and export the handler as named `proxy`; the API is the same:

```typescript
// proxy.ts (Next 16+)
import { withPasswordProtect } from '@tommyvez/passfort/next';

export const proxy = withPasswordProtect({ protectAll: true });
// or: paths: ['/admin', '/preview'], for specific routes only

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
```

You can migrate existing `middleware.ts` with the official codemod: `npx @next/codemod@canary middleware-to-proxy .`

### 3. Set Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

| Variable            | Required | Description                                                                                             |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `PASSFORT_SECRET`   | Yes      | Min 16 chars. For session signing. Generate: `openssl rand -base64 24`                                  |
| `PASSFORT_PASSWORD` | Yes\*    | Plain password (quick start)                                                                            |
| `PASSFORT_HASH`     | Yes\*    | PBKDF2 hash (production) - use `npx passfort hash "pass"`                                               |
| `PASSFORT_ENABLED`  | No       | Set to `false` or `0` to turn protection off without code changes. Redeploy and protection is disabled. |
| `PASSFORT_RATE_LIMIT_MAX` | No | Max password attempts per client IP per window (default 10). Set to `0` to disable. |
| `PASSFORT_RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default 60000). |

\*Use either `PASSFORT_PASSWORD` or `PASSFORT_HASH`, not both.

> **Backward compatibility:** `PASSWORD_PROTECT_*` and `VERCEL_PASSWORD_*` env vars are still supported.

### 4. Deploy

That's it. Your protected routes now require a password.

## Configuration Options

### Protect specific paths

```typescript
withPasswordProtect({
  paths: ['/admin', '/preview', '/internal'],
});
```

### Protect entire site (except public assets)

**Option A: In code**

```typescript
withPasswordProtect({
  protectAll: true,
  excludePaths: ['/login', '/public'],
});

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
```

**Option B: Via Vercel env (no code changes)**

Set in Vercel → Settings → Environment Variables:

| Env Var                  | Value            | Description                          |
| ------------------------ | ---------------- | ------------------------------------ |
| `PASSFORT_ALL`           | `true`           | Protect whole site                   |
| `PASSFORT_EXCLUDE_PATHS` | `/login,/public` | Comma-separated paths to keep public |

Minimal middleware:

```typescript
import { withPasswordProtect } from '@tommyvez/passfort/next';

export default withPasswordProtect({});

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
```

With `PASSFORT_ALL=true`, every page under the site is blocked until the password is entered.

### Block all routes (maintenance mode, no password)

Block everyone with no form or input — e.g. for maintenance. Run `npx passfort matcher --block` to print the middleware snippet. Set **only** `PASSFORT_BLOCK_ONLY=true` in Vercel. No password or secret required. Matched routes get **503 Service Unavailable**.

Same middleware as "protect entire site"; the env var switches behaviour. To restore access, remove `PASSFORT_BLOCK_ONLY` and redeploy.

### HTTP Basic Auth (browser popup)

```typescript
withPasswordProtect({
  paths: ['/api/admin'],
  mode: 'basic', // Set via PASSFORT_MODE=basic
});
```

Or set `PASSFORT_MODE=basic` in env.

### Customize the password form

**In code:**

```typescript
withPasswordProtect({
  paths: ['/admin'],
  form: {
    title: 'Enter Access Key',
    description: 'This preview is private.',
    placeholder: 'Access key',
    buttonText: 'Unlock',
    theme: 'light', // or 'dark' (default)
  },
});
```

**Or via env vars:**

| Env Var                     | Description                |
| --------------------------- | -------------------------- |
| `PASSFORT_FORM_TITLE`       | Page title and heading     |
| `PASSFORT_FORM_DESCRIPTION` | Text below heading         |
| `PASSFORT_FORM_PLACEHOLDER` | Password input placeholder |
| `PASSFORT_FORM_BUTTON`      | Submit button text         |
| `PASSFORT_FORM_THEME`       | `light` or `dark`          |

### Disable protection without code changes

**Turn protection off:** Set `PASSFORT_ENABLED=false` (or `0`) in Vercel Dashboard → Environment Variables, then redeploy. The middleware stays in your code, but protection is disabled — all routes are accessible without a password.

**Turn protection back on:** Set `PASSFORT_ENABLED=true` (or remove the variable), then redeploy. No code changes or PR needed.

This is useful when:

- You need to temporarily disable protection (e.g., during debugging)
- You want to enable/disable via Vercel UI without touching code
- You're testing and don't want to remove middleware from the codebase

> **Note:** When `PASSFORT_ENABLED=false`, the middleware still runs but returns `null` immediately, so requests pass through to your app. This is different from removing the middleware file entirely.

### Custom login page

Use your own page instead of the built-in form:

```typescript
withPasswordProtect({
  paths: ['/admin'],
  loginPath: '/login',
});

// Matcher must include loginPath for form submission
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
```

Create `app/login/page.tsx` (or equivalent). The form must:

- `method="POST"`
- `action={return_url}` (from `?return_url=...` query param)
- Include `<input type="hidden" name="return_url" value={return_url} />`
- Include `<input type="password" name="password" />`

```tsx
// app/login/page.tsx
export default function LoginPage({ searchParams }) {
  const returnUrl = searchParams.return_url || '/';
  return (
    <form method="POST" action={returnUrl}>
      <input type="hidden" name="return_url" value={returnUrl} />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Continue</button>
    </form>
  );
}
```

## Production: Use Password Hash

For production, use a hashed password instead of plain text:

```bash
npx passfort hash "your-secure-password"
```

Add the output to Vercel as `PASSFORT_HASH`.

## How It Works

- **Edge Middleware**: Runs at the edge before your app. Zero cold starts.
- **Session Cookie**: HttpOnly, Secure, SameSite. Signed with your secret.
- **Route Matcher**: Only runs on routes you specify - minimal overhead.


## Security

- PBKDF2-SHA256 (100k iterations) for password hashing
- HMAC-SHA256 signed session cookies
- Timing-safe password comparison
- Rate limiting on password attempts (per client IP; configurable; best-effort in Edge—see [SECURITY.md](SECURITY.md))
- No database required - stateless

See **[SECURITY.md](SECURITY.md)** for reporting vulnerabilities and security considerations.

## Local Development

For `http://localhost`, the session cookie is set without the `Secure` flag so it works in development. In production (HTTPS), the cookie is always `Secure`.

## Example & Walkthrough

See [`examples/nextjs-app/README.md`](examples/nextjs-app/README.md) for a step-by-step walkthrough.

## Testing

```bash
pnpm test
pnpm run test:coverage   # with coverage; CI enforces 80% on core src
```

## License

MIT
