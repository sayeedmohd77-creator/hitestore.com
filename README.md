# HiteStore.com — Offline development prototype

**A self-contained, responsive fashion shopping storefront for Windows localhost.** No subscriptions, API keys, database, npm install, or external network connection are needed to view this prototype. All demo illustrations are bundled locally. The logo/art are provisional branding, not extracted from Myntra.

## Start on Windows PowerShell

1. Extract the ZIP archive into `C:\HiteStore` (a folder named `hitestore-localhost` should appear).
2. Install **Node.js LTS** if you do not have it already. HTECSBooks may have installed Node previously.
3. Open PowerShell:

```powershell
cd C:\HiteStore\hitestore-localhost
node server.js
```

4. Visit **http://localhost:3009** in Chrome or Edge. Keep PowerShell open. Press **Ctrl+C** to stop.

Alternatively from the project folder run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-hitestore.ps1
```

If port 3009 is busy, set an alternate port with `$env:PORT=3010; node server.js` and browse `http://localhost:3010`.

## Working demo functionality

- Responsive homepage, category sections and promotional editorial panels.
- Men/Women/Kids/Accessories catalogue, product pages, search, category/size filters, price/discount/rating sorting.
- Product sizes, colour information, inventory, wishlist, quantity-controlled shopping cart.
- **WELCOME10** demo coupon, demo shipping threshold, non-payment checkout simulation and demo order history.
- Demo `/admin` dashboard: inventory changes, add/delete custom demo products, simulated order status, reset.
- Data persists **only in this browser's localStorage**, not between devices.
- Product art is illustrative (offline SVGs), not licensed brand photography or real inventory.

## Connect to GitHub (separate repository)

Your linked GitHub account currently has `sayeedmohd77-creator/htecs.com`. A separate `hitestore.com` repository was not accessible when checked; **do not mix the projects**.

1. Sign into GitHub at https://github.com/new and create an **empty** repository named `hitestore.com` under `sayeedmohd77-creator`. Recommend **Private** during development. Do not initialize README/gitignore/license.
2. Extract this project locally. Install Git for Windows if needed.
3. From PowerShell in this folder run:

```powershell
powershell -ExecutionPolicy Bypass -File .\connect-github.ps1
```

The script uses a fixed remote `https://github.com/sayeedmohd77-creator/hitestore.com.git`, asks for confirmation, initializes Git if necessary, commits files, and pushes `main`. GitHub authentication is required and **no credentials are included**. If the repository already contains work, do not blindly push: first reconcile its history to avoid losing data.

Manual alternative:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial offline HiteStore storefront prototype"
git remote add origin https://github.com/sayeedmohd77-creator/hitestore.com.git
git push -u origin main
```

For future changes: `git add .; git commit -m "Update storefront"; git push`.

## Routes

- `#/` Homepage
- `#/shop` All products and filters
- `#/shop?category=Women` Women's category
- `#/product/p02` Product detail
- `#/wishlist`, `#/cart`, `#/orders`
- `#/admin` **UNPROTECTED DEMO PANEL**

## Important limitations — NOT production-ready

This is a **front-end proof of concept** with an offline local server. There is no secure sign-in, persistent server-side database, legitimate payment gateway, secure order processing, stock locking, product image uploads, courier tracking, tax-invoice engine, audit logging, or customer data protection. **Do not deploy this demo as a live public store** or collect real buyer information. Before launch, add a properly authenticated backend or migrate storefront to WooCommerce, configure payments/shipping/GST/privacy/refunds and use real photos and branding. Hostinger Website Builder source files do not automatically sync with this project; the existing domain/site is untouched.

## Stack

Vanilla HTML/CSS/JavaScript + Node.js built-in HTTP server (zero runtime dependencies). Easy to version in GitHub and edit in VS Code without paid code-generation credits. The implementation deliberately separates demo UI and local state to allow an eventual production backend integration.

## Development QA

```powershell
node --check .\server.js
node --check .\js\app.js
node --check .\js\data.js
```

Also manually check home, category search, product/size selection, cart, coupon, placing a **demo** order, inventory deduction, and admin stock changes.
