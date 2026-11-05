# Launching a New Franchise Portal

How to stand up a portal for another corporate client. It's all setup; **no code changes or deploy are needed**, apart from the Slack env var. Budget about 2–4 hours, including testing.

The rest of this guide uses a fictional client, "Acme Coffee", to make the steps concrete.

---

## 0. Decide the basics

- **Portal handle:** lowercase, hyphenated, permanent. e.g. `acme-coffee`. It's used in every tag, so pick carefully.
- **Subdomain:** e.g. `acmecoffee.byopenhouse.com`.
- **From the client:**
  - logos (web formats: SVG or large transparent PNG). You need a horizontal one for the header, a stacked one for the landing page, and a small mark for the favicon and mobile header.
  - brand colors (hex)
  - a web-licensed font that's available on **Google Fonts**. Desktop font licenses usually don't allow web use, so check.
  - a contact for verifying franchisees, and the corporate admin's email

## 1. Domain

1. **DNS** (GoDaddy, for byopenhouse.com): add a `CNAME` record with name `acmecoffee` → `shops.myshopify.com`.
2. **Shopify admin → Settings → Domains → Connect existing domain:** add `acmecoffee.byopenhouse.com`. Set **Target: Openhouse (Production)** and **Type: Alias domain**. Don't make it primary.
3. Wait for "Connected" and "TLS certificate provisioned".

## 2. Login

**Hydrogen → Openhouse → Storefront settings → Customer Account API → Application setup.** Add:
- Callback URI: `https://acmecoffee.byopenhouse.com/account/authorize`
- JavaScript origin: `https://acmecoffee.byopenhouse.com`
- Logout URI: `https://acmecoffee.byopenhouse.com`

## 3. Catalog collection

1. **Products → Collections → Create collection:** title it e.g. "Acme Coffee", and make sure the handle is `acme-coffee`. Make it **Automated** with the condition **Product tag is equal to `portal:acme-coffee`**.
2. Publish it **only to the Openhouse Hydrogen storefront**.
3. Optional: add **Product tag is not equal to `portal:acme-coffee`** to the main site's automated collections.

## 4. Portal entry (branding, copy, routing)

**Content → Metaobjects → Franchise portal → Add entry.** Set the **handle** to `acme-coffee`, then fill in:

| Field | Example | Required |
|---|---|---|
| `name` | Acme Coffee | ✓ |
| `hostname` | acmecoffee.byopenhouse.com | ✓ |
| `collection` | the `acme-coffee` collection | ✓ |
| `lead_time` | Ships in under 4 weeks | |
| `logo_header` | horizontal logo (shown at 280px wide) | |
| `logo_landing` | stacked logo (shown at 220px wide) | |
| `logo_mark` | small mark (favicon, mobile header) | |
| `font_family` | a Google Fonts family name | |
| `color_text`, `color_background`, `color_accent`, `color_button`, `color_button_text`, `color_error`, `color_error_background` | hex values | |
| `landing_headline`, `landing_body`, `pending_message` | short, in the client's voice | |
| `onboarding_fields` | leave empty (see below) | |

**Contrast:** check text and button colors with a contrast checker. Text on the background and on the button should be at least 4.5:1.

Blank optional fields fall back to defaults, so the portal works before the branding is final.

## 5. Sign-up notifications (the one developer step)

1. Create a Slack channel (e.g. `#acme-portal-signups`), and add an incoming webhook for it on the existing portal sign-ups Slack app (the one created for Magnolia).
2. In **Hydrogen → Openhouse → Environments and variables**, add `SLACK_PORTAL_ACME_COFFEE_WEBHOOK_URL`. That's the handle, uppercased, with `-` → `_`. Mark it secret and apply it to Production.
3. **Redeploy**, so Oxygen picks up the new variable.

## 6. Products

Add the client's products per the [runbook](runbook.md#add-or-change-portal-products): tag `portal:acme-coffee`, MOQ metafields, continue selling when out of stock, alt text set to the color name, published to the Hydrogen storefront only.

## 7. Nothing to do for orders

The Shopify Flow workflow "Tag franchise portal orders" already covers every portal: it tags orders with `portal:{handle}` from the cart.

---

## 8. Launch test

Use a test email (e.g. a `+acmetest` alias), and give it a 100% discount code limited to that customer and the test product.

1. `acmecoffee.byopenhouse.com` shows the branded landing page. On `www`, the client's products and collection aren't findable in search, collections or the sitemap.
2. **Sign up** → you see the pending screen, a Slack message arrives, and the customer is tagged `portal:acme-coffee:pending`.
3. Swap the tag to `…:member` → the portal opens the catalog.
4. **Product page:** pick colors and quantities. MOQ blocks Add to cart until it's met, and the gallery follows the selected colors.
5. **Cart:** lines are grouped by color. Lowering a color below its MOQ disables Checkout.
6. **Checkout:** saved locations are offered. Complete the $0 order.
7. **"Continue shopping"** on the thank-you page lands on the portal's Orders page.
8. **Admin:** the order has the tag `portal:acme-coffee` and `_portal: acme-coffee` under additional details.
9. **Portal → Orders:** the order appears within a minute or two. **Re-order** refills the cart.
10. Clean up: cancel the test order and deactivate the discount.

Then tag the corporate admin (`portal:acme-coffee:admin`), and hand the client's team the [runbook](runbook.md).

---

## Reference

- Architecture and decisions: [franchisePortal.md](franchisePortal.md)
- Portal config loader: [`app/lib/portals.js`](../../app/lib/portals.js) (`loadPortals`)
