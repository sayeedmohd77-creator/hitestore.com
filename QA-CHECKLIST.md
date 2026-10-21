# HiteStore — manual testing checklist

Test locally with `node server.js`, then open `http://localhost:3009`:

- [ ] Home opens and all pictures display without internet.
- [ ] Men, Women, Kids and Accessories menu links filter products.
- [ ] Search for `Kurta` returns relevant products.
- [ ] Shop filter size `M` and sorting by `Price: low to high` work.
- [ ] Open a product, select a size, change quantity and add to shopping bag.
- [ ] Heart icon adds/removes an item from Wishlist.
- [ ] Bag quantities increase/decrease; removing item works.
- [ ] Apply coupon `WELCOME10`; discount appears.
- [ ] Place a **demo** order (no payment). Orders screen lists it.
- [ ] Admin inventory stock decreases for the simulated order.
- [ ] In Admin, change stock; refresh the browser and verify it persists.
- [ ] In Admin, add a demo product, then find it in catalogue search.
- [ ] Reload browser and verify cart/wishlist/admin demo data persists.
- [ ] Check layout on a phone-sized Chrome window and a normal laptop screen.
- [ ] Admin > Demo settings > Reset demo data, and confirm restored state.

**Before production:** authentication, customer accounts, secure payments, real order processing, GST invoices, product photography, stock locking, legal pages, shipping, returns, database, admin security, backups, monitoring and deployment are all outstanding.

## V2 QA
- [ ] Shop brand filter narrows product cards; price and available-only filters combine correctly.
- [ ] Search SKU HT-P02 shows Weekend Midi Dress.
- [ ] Admin stock table shows SKU, in-stock/low/out-of-stock labels, and low-stock totals.
- [ ] Export Inventory CSV downloads a file with product SKUs and quantities.
- [ ] Existing cart, wishlist and demo order workflows still work.
