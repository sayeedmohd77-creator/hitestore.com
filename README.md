# HiteStore V3 — Local Development

A **local-only** fashion storefront with an incremental, server-backed ecommerce test workflow. **This is not production ready.** The Hostinger website and DNS remain untouched. The current browser-only V2 demo is preserved for comparison.

## Before you start

- Windows with Node.js v18+ and Git installed.
- Source checkout: `C:\HiteStore\hitestore-localhost` (the same folder as V2).
- To avoid losing existing work, run `git status` **before applying an update**. Do not overwrite local uncommitted changes.
- All images are development illustrations; your official HiteStore logo is already integrated.
- **Use invented test information, not real addresses, passwords, or customer records.**

## Run V3 in Windows PowerShell

Open one **new** PowerShell window, then run:

```powershell
cd C:\HiteStore\hitestore-localhost
$secure = Read-Host "Choose a LOCAL TEST admin password (minimum 12 characters)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:HITESTORE_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
node .\server.js
```

Keep this PowerShell running. In Chrome open **http://127.0.0.1:3009** (or `http://localhost:3009`).

If another HiteStore server is already listening on port 3009, stop only that **older HiteStore process** first; do not kill other development apps. Run `Get-NetTCPConnection -LocalPort 3009 -State Listen` to inspect the port.

## New V3 routes

- `#/account` — local customer sign-up / sign-in using password hashing and HttpOnly session cookies.
- `#/checkout` — test recipient, mobile, Indian PIN format and COD (requires customer sign-in).
- `#/my-orders` — orders saved by the local server to a file, scoped to the signed-in test customer.
- `#/manage-orders` — staff login with PowerShell admin password, server-backed demo order workflow.
- `#/cart` — still contains the **old browser demo** button; also links to V3 test checkout.
- `#/admin` — old **unsecured browser demo**, not a production admin console; keep offline only.

The V3 order API calculates prices and discounts on the server from seeded products, checks product sizes/quantity/stock, creates COD orders with payment pending, and lets authenticated staff move them through **test-only** statuses. Invalid transitions fail. Cancellation restores demo stock.

`runtime/demo-store.json` persists between restarts, **is never committed to Git**, and is deliberately inaccessible through the static HTTP server. It is a single-machine development JSON store, NOT an audit-proof, concurrency-safe production database. Browser-local old-demo orders and V3 server-backed orders remain separate.

**PIN validation checks format only** — not actual courier availability. Online payments, GST invoice generation, fulfilment, email/SMS notifications and courier integration are NOT ACTIVE.

## Verification

```powershell
node --check .\server.js
node --check .\backend\dev-commerce.js
node --check .\js\app.js
node --check .\js\v3.js
node .\tools\smoke-test.js
node .\tools\v3-api-test.js
```

After tests, commit and push **only source files**:

```powershell
git status
git add .gitignore README.md QA-CHECKLIST.md package.json index.html server.js css/styles.css js/app.js js/v3.js backend/dev-commerce.js tools/v3-api-test.js
git commit -m "HiteStore V3 local accounts delivery COD backend"
git push origin main
```

Do **not** commit `runtime/` data or `.env` files. No real password is included in this repository. Direct GitHub writes from the ChatGPT connector might fail due to permission restrictions; PowerShell pushes use your existing Git login.

## Production milestones remaining

1. Replace the local JSON store with PostgreSQL or an appropriate transactional database; database transactions and inventory reservations per SKU/size. Migrate browser-local demo stock into real data models.
2. Secure backend code and threat model: real session storage, account/email verification and reset, admin RBAC, comprehensive auditing, input schemas, server-rate limiting backed by shared storage, deployment secrets, backups, monitoring, privacy and consent management.
3. Admin product catalogue with secure image uploads, per-variant stock, vendor/supplier records, coupons/tax rules, returns and refunds.
4. Verify GST registration/invoicing obligations with a qualified professional. Configure tax invoices and legal policies (privacy, returns, cancellation, shipping).
5. Courier API integration, PIN-code serviceability, COD reconciliation and fraud prevention, live order statuses and notifications.
6. Add Razorpay or other India payment gateway using provider-hosted checkout and verified payment webhooks. Never accept raw card data on HiteStore servers.
7. Real customer QA, staging on compatible hosting, domain renewal, final backup, SSL, privacy and uptime review; only then cut the Hostinger domain over.

**Do not publish this V3 code to a public server.** `server.js` intentionally binds only to 127.0.0.1. It does not contain production protections.

### Checkout validation patch
V3 checkout now displays one error per failed attempt and returns the specific invalid delivery field. Address line 1 requires at least eight characters, a 10-digit mobile, and PIN six digits starting 1–9. This is local-only demo functionality.
