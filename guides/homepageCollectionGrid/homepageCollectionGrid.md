# Homepage "Categories" Grid — Admin Guide

This is the grid of tiles on the homepage labeled **CATEGORIES**, right below the hero. It's
controlled by a custom object (metaobject) in Shopify Admin, not by code — this doc explains
what to edit and what each field does.

## Where to find it

**Content → Metaobjects → Homepage Collection Grid**, entry with handle `explore-all`.

(There's a second entry, `copy-of-explore-all`, which feeds the separate collections-hero
section further down the page — the change described here does **not** touch that one.)

## The fields on "Homepage Collection Grid"

| Field | What it does |
|---|---|
| `blurb` | The paragraph of text shown next to the grid. |
| `button_text` | The label on the "explore all" button under the grid. |
| `collections` | The default list of tiles: pick real Shopify **Collections** here. Each one shows its own collection image and title, and links to that collection. |
| `custom_objects` | **New.** An optional list of custom tiles (see below) that, when used, completely replaces the `collections` tiles in the grid. |

## How the override works

- If `custom_objects` has one or more entries in it, the grid shows **those** tiles instead of
  the `collections` list.
- If `custom_objects` is left empty, the grid falls back to showing the `collections` list like
  it always has.

So the `collections` field is never wasted — it's the fallback/default, and `custom_objects` is
an opt-in override for when you want a tile that isn't a straightforward "link to a collection
with its default image."

## Adding a custom tile

Custom tiles are their own metaobject type, **Homepage Collection Grid Object**. To add one:

1. Go to **Content → Metaobjects → Homepage Collection Grid Object** and create a new entry.
2. Fill in its two fields:
   - **`image`** — upload the picture you want on the tile.
   - **`link`** — this is a text field holding both the tile's caption and where it links to,
     entered as: `{"text":"Hats","url":"https://www.byopenhouse.com/collections/frontpage?filter=%7B%22tag%22%3A%22headwear%22%7D"}`
     - `text` is the caption printed under the image on the homepage.
     - `url` is where clicking the tile goes. You can point it at a collection, a filtered
       collection view, a page, or anywhere else on the site — paste the full page URL from
       your browser's address bar.
3. Go back to the **Homepage Collection Grid** entry (`explore-all`) and add your new object to
   the `custom_objects` list.
4. Order matters: tiles render in the same order the objects are listed in `custom_objects`.

## Notes

- `link.url` can be pasted as the full `https://www.byopenhouse.com/...` address — the site
  automatically strips it down to a relative link, so it keeps working correctly whether you
  paste the full URL or just the path.
- There's no character limit or required format for `text` beyond keeping it short enough to
  read as a tile caption (existing collection titles are typically one or two words).
- Removing all entries from `custom_objects` instantly reverts the grid to the `collections`
  list — useful for testing without deleting your custom tiles.
