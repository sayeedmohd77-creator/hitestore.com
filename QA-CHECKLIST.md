# HiteStore V3 — QA Checklist (Local only)

## Automated tests
- [ ] `node --check server.js`
- [ ] `node --check backend/dev-commerce.js`
- [ ] `node --check js/app.js`
- [ ] `node --check js/v3.js`
- [ ] `node tools/smoke-test.js` — legacy shopping and COD browser demo tests
- [ ] `node tools/v3-api-test.js` — end-to-end local auth, COD, order status and persistence tests

## Manual Chrome checks
- [ ] `http://localhost:3009` loads with the official HiteStore logo.
- [ ] Women, Men, Kids, Accessories, wishlist and original cart continue working.
- [ ] `#/account` opens sign-up and login forms. Register with invented email/name/password.
- [ ] In product `p02`, add size M to cart. `#/checkout` shows your bag.
- [ ] Enter fabricated address, ten-digit phone and syntactically valid 6-digit Indian PIN (format only).
- [ ] Confirm simulated COD payment and submit the V3 checkout.
- [ ] `#/my-orders` shows the server-backed order and *pending collection*.
- [ ] Refresh browser: order remains. Restart local server and log in again: order remains.
- [ ] `#/manage-orders` requires a staff password before displaying orders.
- [ ] Try marking PACKED, SHIPPED, DELIVERED, or CANCELLED and test-only collection.
- [ ] Confirm a wrong admin password is rejected, ordinary customer cannot access admin API.
- [ ] Use only invented data. Do not enter real buyers, shipping addresses or real payment information.
- [ ] Verify older `#/orders` remains labelled as browser-only demo history.

## Before live launch — blocking
- [ ] Production authentication, RBAC, safe password recovery and data protection
- [ ] Transactional database and stock reservations; product variants and images
- [ ] Authenticated order processing; coupons and taxes recalculated on the server
- [ ] Verified delivery ZIP/PIN serviceability, courier COD settlement, fraud controls
- [ ] Complete privacy/cookie, shipping, returns/refunds and terms policies
- [ ] Gateway integration with server-to-server webhook verification
- [ ] Staging QA, security review, domain renewal, SSL and backups
- [ ] Remove/disable every demo order, browser admin, and unprotected test feature

### V3 checkout validation fix

- [ ] Enter a short address (`hyd`) on the COD test checkout; see one clear `Address line 1 needs at least 8 characters` error.
- [ ] Click submit again: error must not duplicate.
- [ ] Enter a 10-digit invented mobile number and a full fictitious street address with at least 8 characters, a city, state and a six-digit PIN beginning 1–9.
- [ ] Submit one demo COD order and confirm it appears under `#/my-orders` with payment pending.
- [ ] This is still LOCAL TEST ONLY: do not enter any real customer details or publish to the live domain.
