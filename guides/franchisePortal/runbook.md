# Franchise Portal Runbook (Openhouse)

Day-to-day tasks for running a franchise portal in Shopify admin. Examples use Magnolia Bakery: portal handle `magnolia-bakery`, at `magnoliabakery.byopenhouse.com`. For another portal, swap in its handle.

Everything here happens in **Shopify admin**. Nothing needs a developer.

---

## How access works

Each franchisee is a normal Shopify customer. Their portal access is a **customer tag**:

| Tag | Meaning |
|---|---|
| `portal:magnolia-bakery:pending` | Signed up, waiting for you to verify. Can't browse or order. |
| `portal:magnolia-bakery:member` | Verified franchisee. Can browse, order and see their orders. |
| `portal:magnolia-bakery:admin` | The client's corporate account. Member access, plus the portal's **Admin** pages (all orders, member access). |
| `portal:magnolia-bakery:revoked` | Access removed. Sees an "access removed" notice and can't sign up again. |

Give each customer **one** of these per portal. If someone somehow has several, the highest wins (admin, then member, then pending).

---

## Approve a new franchisee

1. A sign-up posts to the portal's Slack channel (`#magnolia-portal-signups`) with the franchisee's name, email, phone, store and address.
2. Click **Review in Shopify** in the Slack message. The same details are in the customer's **Notes**.
3. Check that they're a real franchisee.
4. In the customer's **Tags**: **remove** `portal:magnolia-bakery:pending` and **add** `portal:magnolia-bakery:member`. Save.

It takes effect on their next page load: they'll land on the catalog.

The client's corporate admin can also do this from the portal: **Admin → Members → Approve**.

## Remove or restore a franchisee's access

- **From the portal (corporate admin):** **Admin → Members → Remove access** / **Restore access**.
- **From Shopify admin:** swap `portal:magnolia-bakery:member` for `portal:magnolia-bakery:revoked`. To restore, swap it back. If you only delete the member tag, they can simply sign up again.

Access ends within **about 5 minutes**. Their past orders stay in Shopify.

## Set up the corporate (admin) account

Ask the client for their corporate contact's email.
- **If that person already has a customer account,** add `portal:magnolia-bakery:admin` to it.
- **If not,** have them sign up on the portal first. They'll come through Slack like any franchisee. Then give them `…:admin` instead of `…:member`.

---

## Add or change portal products

1. Create the product as usual, with **one regular price** and no price tiers.
2. **Tag it `portal:magnolia-bakery`.**
   - The product then appears in the portal's catalog automatically, through the `magnolia-bakery` automated collection.
   - It's also hidden everywhere on byopenhouse.com.
   - Normal category tags (drinkware, carry, …) are fine. They power the portal's filters too.
3. **Minimum order quantity (MOQ):**
   - **Product MOQ:** the product metafield `custom.minimum_quantity`.
   - **Per-color MOQ (optional):** the variant metafield `custom.variant_minimum_quantity_priority`. **Use the same value on every size of a color.**
4. Inventory: turn on **Continue selling when out of stock**. Openhouse fulfills within 4 weeks, so franchisees can order beyond stock.
5. **Images:** set each image's **alt text to its color name** (e.g. `Natural`). Picking that color on the product page then brings its images to the front.
6. **Sales channels:** publish **only to the Openhouse Hydrogen storefront**. Leave Shop, Google & YouTube, Facebook/Instagram and the Online Store off, if connected. The site hides portal products, but other channels don't.

To retire a product, archive it, or remove the `portal:magnolia-bakery` tag.

## Keep the main site clean

- On main-site **automated collections** (`all`, `in-stock`, `new-arrivals`, `best-sellers`, `frontpage`, …), add the condition **Product tag is not equal to `portal:magnolia-bakery`**. The site already hides portal products, but this keeps page sizes and product counts exact.
- Never add portal products to main-site manual collections.

---

## Orders

- A Shopify Flow workflow, **"Tag franchise portal orders"**, tags portal orders `portal:magnolia-bakery` automatically. To see them, filter **Orders** by that tag.
- **New orders take a minute or two** to appear in the franchisee's order history, while Flow adds the tag. The portal says so on the page.
- **Orders you create by hand** (draft orders, phone or email orders) aren't tagged automatically. **Add the tag `portal:magnolia-bakery` to the order** and it'll appear in the franchisee's history.
- Fulfillment works as usual. When an order ships, its tracking link appears in the franchisee's order history.

---

## Change branding or wording

**Content → Metaobjects → Franchise portal → Magnolia Bakery**

| What | Field |
|---|---|
| Landing page headline and text | `landing_headline`, `landing_body` |
| Message while awaiting approval | `pending_message` |
| Lead time on product pages | `lead_time` |
| Header logo, landing logo, small logo / tab icon | `logo_header`, `logo_landing`, `logo_mark` |
| Colors | `color_*` (hex values, e.g. `#00211A`) |
| Font | `font_family` (a Google Fonts family name, e.g. `Karla`) |

Changes go live within **a few minutes**, with no deploy.

**Don't change** the entry's **handle**, `hostname` or `collection` without a developer: those connect the portal to its domain, tags and catalog.

---

## Troubleshooting

| Problem | Check |
|---|---|
| A franchisee is stuck on "verifying" | Their tags: `…:pending` should be swapped for `…:member`. |
| No Slack message for a sign-up | The customer should still be tagged `…:pending`. Find them by that tag. Then ask the developer to check the Slack webhook. |
| A portal product shows on byopenhouse.com | Its `portal:magnolia-bakery` tag (spelling matters) and its sales channels. |
| A product is missing from the portal | Tag, status (Active), and published to the Openhouse Hydrogen storefront. |
| Product page won't allow Add to cart | Each selected color must meet its MOQ. The page shows `TOTAL(n) IS BELOW MOQ(m)`. |
| An order is missing from the franchisee's history | Wait a couple of minutes for Flow. For hand-made orders, add the tag. |

---

## Corporate admin pages

Customers tagged `portal:magnolia-bakery:admin` get an **Admin** link in the portal header:
- **Orders:** every portal order across all franchisees, searchable by order number, name or email, and filterable by shipped status and date. Each order opens to its items, ship-to address and tracking.
- **Members:** everyone with portal access. Approve sign-ups, remove access, restore access.

Admins can't change other admins or themselves. Openhouse manages admin tags in Shopify admin.
