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

## V4 — Local inventory, product images, delivery rules and return requests

**V4 remains a DEVELOPMENT PROTOTYPE, not an ecommerce platform ready to publish.** It must not be exposed to the public or used to collect real customer information, ship goods, receive real COD payments or issue real refunds.

### New pages

- `http://localhost:3009/#/catalog-admin` — authenticated staff catalogue, size-by-size stock, upload test photos (JPEG/PNG/WebP under 650 KB), edit demo products, sample shipping charges and PIN prefixes, approve/reject simulated returns.
- `http://localhost:3009/#/returns` — signed-in customer can request a *demo* return within 7 days for a *demo delivered* order.
- `http://localhost:3009/#/checkout` — "Check demo PIN zone" uses configurable sample 3-digit prefixes. **These do not represent any actual courier serviceability.**

To use staff functions, start `node server.js` in the *same PowerShell window* where `$env:HITESTORE_ADMIN_PASSWORD` was configured. Use at least 12 characters and keep it private; it is not saved in the source code. Staff sign-in occurs at `#/manage-orders` before navigating to `#/catalog-admin`.

### How V4 handles existing V3 test data

- The existing `runtime/demo-store.json` file is **not reset or replaced**. V4 adds optional `customProducts`, `variants`, and `shipping` fields when required.
- **Seeded (V1–V3) products initially retain their legacy aggregate stock.** On the V4 stock page, entering and saving size-specific quantities replaces the total with the sum of those quantities. Allocate carefully when testing. A live migration must reconcile actual stock per size from trusted inventory records.
- New server-created products require unique SKU, prices and a list of sizes. They initially have zero stock; allocate each size using the V4 stock controls.
- The legacy `#/admin` page is still an *unsecured browser-only demonstration*. V4 staff changes occur only on `#/catalog-admin`. Real production admin access is still future work.
- Photos are stored in `runtime/product-images/` and are explicitly ignored by Git. When copying V4 code from the ZIP, **do not delete `runtime/`**, since it contains existing local accounts, simulated orders and any test photos.
- Delivery fees and sample PIN prefixes are locally configurable, but real production serviceability requires a trusted courier API and commercial agreements.
- Return approval performs a **single simulated restock**; it does not create a refund, a courier return label, a real return booking, or a credit note.

### Windows install — changed files only

1. Back up the whole `C:\HiteStore\hitestore-localhost` directory and especially the ignored `runtime` directory before updating.
2. Stop the active HiteStore server on port 3009 after verifying its process is HiteStore's Node.js server. Other Node servers such as HTECSBooks must stay running.
3. Check `git status --short`; resolve unexpected tracked changes before extraction. Download `hitestore-v4-update.zip`, locate it with Chrome Ctrl+J, and extract it into `C:\HiteStore\hitestore-localhost` using `Expand-Archive -LiteralPath <actual path> -DestinationPath 'C:\HiteStore\hitestore-localhost' -Force`.
4. Run `npm.cmd run check` and `npm.cmd test` in that directory. **Do not push if either fails.**
5. Start the local server with a 12+ character admin environment password, then test staff login, catalogue, stock, shipping and return workflow in Chrome. Keep the server window open.
6. After browser verification, use `git add backend/v4.js backend/dev-commerce.js server.js js/v4.js js/v3.js js/app.js css/styles.css index.html package.json tools/v4-api-test.js README.md QA-CHECKLIST.md` followed by `git diff --cached --stat`, `git commit` and `git push origin main`.

### V4 automated tests

```powershell
cd C:\HiteStore\hitestore-localhost
npm.cmd run check
npm.cmd test
```

The V4 API tests use a fresh temporary directory for fake accounts and orders. They do not change your working `runtime/demo-store.json`. The tests also verify that private storage stays inaccessible from the website and that order stock cannot be oversold across multiple size lines.

**Before production:** migrate to a managed database, authenticated administrator roles, secure session keys, verified email/phone delivery workflows, real courier serviceability, payment gateway and COD settlement integrations, GST-compliant invoices, robust photo processing, audit trail, backups, security review and real returns policies. Do not publish V4 to Hostinger yet.
