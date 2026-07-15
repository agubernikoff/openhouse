# ProductForm — Current Behavior (pre-simplification snapshot)

This document captures how [`app/components/ProductForm.jsx`](../../app/components/ProductForm.jsx)
and its parent [`app/routes/products.$handle.jsx`](../../app/routes/products.$handle.jsx) work
**today**, before a simplification pass. It exists purely as a reference for "what did the old
code do" if behavior needs to be preserved or intentionally dropped.

## Why it's complicated

`ProductForm` renders two very different UIs depending on `orderType`:

- **wholesale**: multi-select colors, then a per-color size×quantity matrix, with MOQ
  (minimum order quantity) and made-to-order lead-time logic.
- **sample**: standard single-variant picker (color/size radio buttons driven by URL
  navigation) with a simple quantity stepper capped at available stock.

Both modes are implemented in the same component/functions via `orderType === '...'` branches,
which is the main source of complexity.

## State ownership

State lives in the **parent route**, not the form itself:

```jsx
// app/routes/products.$handle.jsx:160-165
const [orderType, setOrderType] = useState('wholesale');
const [selectedColors, setSelectedColors] = useState(() => {
  const colorOption = reorderedOptions.find((opt) => opt.name === 'Color');
  const current = colorOption?.optionValues?.find((v) => v.selected);
  return current ? [{name: current.name, sizes: {}}] : [];
});
```

`selectedColors` shape: `[{name: 'Black', sizes: {S: 2, M: 0, L: 5}}, ...]`. This is only
meaningful in `wholesale` mode — one entry per selected color, with a `sizes` map of
size-name → quantity.

Both are reset whenever the product changes:

```jsx
// app/routes/products.$handle.jsx:197-203
useEffect(() => {
  setOrderType('wholesale');
  const colorOption = reorderedOptions.find((opt) => opt.name === 'Color');
  const current = colorOption?.optionValues?.find((v) => v.selected);
  setSelectedColors(current ? [{name: current.name, sizes: {}}] : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [product.id]);
```

`ProductForm` itself only owns `quantity` (sample-mode stepper) and `added` (button
feedback state) — [ProductForm.jsx:50-51](../../app/components/ProductForm.jsx#L50-L51).

The **selected variant** (`selectedVariant`), by contrast, is driven by the URL via Hydrogen's
`useOptimisticVariant` + `useSelectedOptionInUrlParam` in the parent, and is what `sample` mode
actually reads/writes against (color/size selection in sample mode navigates the URL rather than
touching local state).

## Order Type selector

Always the first option block, hardcoded (not part of `productOptions` — it's filtered out):

```jsx
// ProductForm.jsx:27-29
const filteredOptions = productOptions.filter(
  (option) => option.name !== 'Order Type',
);
```

Clicking a type calls `handleOrderTypeChange`:

```jsx
// ProductForm.jsx:149-170
const handleOrderTypeChange = (type) => {
  setOrderType(type);
  if (type === 'sample') {
    if (
      !colorInStockMap[
        selectedVariant?.selectedOptions?.find((o) => o.name === 'Color')
          ?.value
      ]
    ) {
      const colorOption = productOptions.find((opt) => opt.name === 'Color');
      const firstInStock = colorOption?.optionValues?.find(
        (v) => colorInStockMap[v.name],
      );
      if (firstInStock) {
        navigate(`?${firstInStock.variantUriQuery}`, {
          replace: true,
          preventScrollReset: true,
        });
      }
    }
  }
};
```

Switching to `sample` while the currently-selected color has no in-stock variant
auto-navigates to the first in-stock color (samples can't be made-to-order). `sample` is
disabled entirely if no color is in stock at all (`sampleDisabled`, ProductForm.jsx:91-93).

## Color option rendering

Color in/out-of-stock status is derived from *any* size variant of that color being in stock:

```jsx
// ProductForm.jsx:78-93
const colorOption = productOptions.find((opt) => opt.name === 'Color');

// A color is in stock if at least one of its size variants is not currentlyNotInStock.
const colorInStockMap = variants.reduce((acc, variant) => {
  const color = variant.selectedOptions?.find(
    (o) => o.name === 'Color',
  )?.value;
  if (color && !variant.currentlyNotInStock) {
    acc[color] = true;
  }
  return acc;
}, {});

const sampleDisabled = !colorOption?.optionValues?.some(
  (opt) => colorInStockMap[opt.name],
);
```

Rendering splits colors into "IN STOCK" vs "MADE TO ORDER" groups, but only in wholesale mode
(`ColorOptionGrid`, ProductForm.jsx:612-654). In sample mode all colors render in a single grid
(`inStock`/`madeToOrder` arrays are only computed/used for the color option — ProductForm.jsx:236-241).

Per-value click behavior forks on mode inside the shared `renderValue` closure:

```jsx
// ProductForm.jsx:255-258, 309-322
const isWholesaleColor = isColorOption && orderType === 'wholesale';
const isSelected = isWholesaleColor
  ? selectedColors.some((c) => c.name === name)
  : selected;
...
onClick={() => {
  if (isWholesaleColor) {
    setSelectedColors((prev) =>
      prev.some((c) => c.name === name)
        ? prev.filter((c) => c.name !== name)
        : [...prev, {name, sizes: {}}],
    );
  } else if (!isSelected) {
    void navigate(`?${variantUriQuery}`, {
      replace: true,
      preventScrollReset: true,
    });
  }
}}
```

- **Wholesale**: color buttons toggle membership in `selectedColors` (multi-select, local
  state only — no URL navigation, no variant selection).
- **Sample**: color buttons are effectively a single-select that navigates to the variant URL
  (standard Hydrogen option-picker behavior), same as any other non-color option.

## Size option rendering

Dispatches entirely differently per mode via `SizeOptionGrid` (ProductForm.jsx:656-834):

- **Wholesale** (ProductForm.jsx:667-818): renders one block *per selected color*
  (`selectedColors.map(...)`), each with:
  - A header with the color name and a "Delete" button (`onRemoveColor`).
  - A grid of `<input type="number">` per size, capped by available stock display (not
    hard-capped — you can type over stock, which triggers made-to-order/lead-time messaging).
  - A per-color MOQ readout (`TOTAL(n)` / `IS BELOW MOQ(moq)`) and a `+LEAD TIME` flag if any
    size's requested qty exceeds available stock.
- **Sample** (ProductForm.jsx:820-833): just renders the shared `renderValue` grid like any
  other option (radio-style, single choice, navigates URL). Additionally, sizes that are
  out-of-stock *for the currently-selected sample color* are disabled:

```jsx
// ProductForm.jsx:260-267
const isSampleSize = isSizeOption && orderType === 'sample';
const sampleSelectedColor = isSampleSize
  ? (selectedVariant?.selectedOptions?.find((o) => o.name === 'Color')
      ?.value ?? '')
  : null;
const isSampleSizeOutOfStock =
  isSampleSize &&
  (variantQuantityMatrix[sampleSelectedColor]?.[name] ?? 0) === 0;
```

Wholesale size inputs call back into parent-owned state:

```jsx
// ProductForm.jsx:108-118
const handleSizeChange = (colorName, sizeName, qty) => {
  setSelectedColors((prev) =>
    prev.map((c) =>
      c.name === colorName ? {...c, sizes: {...c.sizes, [sizeName]: qty}} : c,
    ),
  );
};

const handleRemoveColor = (colorName) => {
  setSelectedColors((prev) => prev.filter((c) => c.name !== colorName));
};
```

## Stock/quantity lookup

A single matrix built once from `variants`, keyed `[color][size] -> quantityAvailable`, used by
both modes for different purposes:

```jsx
// ProductForm.jsx:119-128
const variantQuantityMatrix = variants.reduce((acc, variant) => {
  const color =
    variant.selectedOptions?.find((o) => o.name === 'Color')?.value ?? '';
  const size = variant.selectedOptions?.find((o) => o.name === 'Size')?.value;
  if (size) {
    if (!acc[color]) acc[color] = {};
    acc[color][size] = Math.max(0, variant.quantityAvailable ?? 0);
  }
  return acc;
}, {});
```

Sample mode additionally derives the *currently selected variant's* remaining quantity, to cap
the quantity stepper (`null` = untracked/no cap, distinct from `0` = out of stock):

```jsx
// ProductForm.jsx:130-147
const selectedVariantColor =
  selectedVariant?.selectedOptions?.find((o) => o.name === 'Color')?.value ??
  '';
const selectedVariantSize =
  selectedVariant?.selectedOptions?.find((o) => o.name === 'Size')?.value ??
  '';
// null means inventory is untracked — no cap; 0 means out of stock
const selectedVariantQty =
  selectedVariantColor || selectedVariantSize
    ? (variantQuantityMatrix[selectedVariantColor]?.[selectedVariantSize] ??
      null)
    : null;

useEffect(() => {
  if (selectedVariantQty !== null) {
    setQuantity((prev) => Math.min(prev, Math.max(1, selectedVariantQty)));
  }
}, [selectedVariantQty]);
```

## MOQ (minimum order quantity)

Two sources, product-level fallback to variant/color-level override:

```jsx
// ProductForm.jsx:31-33
const productMinQty = selectedVariant?.product?.minimumQuantity?.value
  ? parseInt(selectedVariant.product.minimumQuantity.value)
  : null;
```

```jsx
// ProductForm.jsx:99-106
const colorMOQMap = Object.fromEntries(
  (colorOption?.optionValues ?? []).map((v) => {
    const variantMoq = v.variant?.minimumQuantity?.value
      ? parseInt(v.variant.minimumQuantity.value)
      : null;
    return [v.name, variantMoq ?? productMinQty];
  }),
);
```

Only enforced in wholesale mode, per selected color, at add-to-cart time:

```jsx
// ProductForm.jsx:554-562
const anyColorBelowMOQ = selectedColors.some((colorObj) => {
  const moq = colorMOQMap[colorObj.name];
  if (moq == null) return false;
  const total = Object.values(colorObj.sizes).reduce(
    (sum, q) => sum + q,
    0,
  );
  return total < moq;
});
```

## Lead time

Three possible lead-time sources, resolved with a priority order:

```jsx
// ProductForm.jsx:35-44
const variantLeadTime = selectedVariant?.lead_time?.value
  ? mapRichText(JSON.parse(selectedVariant.lead_time.value))
  : null;

const productLeadTime = selectedVariant?.product?.lead_time?.value
  ? mapRichText(JSON.parse(selectedVariant.product.lead_time.value))
  : null;

const inStockLeadTime = variantLeadTime ?? productLeadTime ?? null;
const hasInStockLeadTime = inStockLeadTime !== null;
```

```jsx
// ProductForm.jsx:46-48
const parsedMadeToOrderLeadTime = madeToOrderLeadTime
  ? mapRichText(JSON.parse(madeToOrderLeadTime))
  : null;
```

Displayed lead time flips to the made-to-order copy if *any* selected wholesale line exceeds
available stock, otherwise falls back to the in-stock lead time:

```jsx
// ProductForm.jsx:472-497
const anyExceedsStock = selectedColors.some((colorObj) =>
  Object.entries(colorObj.sizes).some(
    ([sizeName, qty]) =>
      qty > (variantQuantityMatrix[colorObj.name]?.[sizeName] ?? 0),
  ),
);
const isMadeToOrder = anyExceedsStock && parsedMadeToOrderLeadTime;
const displayLeadTime = isMadeToOrder
  ? parsedMadeToOrderLeadTime
  : hasInStockLeadTime
    ? inStockLeadTime
    : null;
```

Note: this reads `selectedColors`/`variantQuantityMatrix` regardless of `orderType`, but in
practice `selectedColors` is only populated in wholesale mode, so in sample mode
`anyExceedsStock` is always `false` and it silently falls through to `inStockLeadTime`.

## Add to cart / cart line construction

Both sets of cart lines are computed unconditionally on every render (IIFE at
ProductForm.jsx:500-591), then the active one is picked by `orderType`:

```jsx
// ProductForm.jsx:501-510
const sampleLines = selectedVariant
  ? [
      {
        merchandiseId: selectedVariant.id,
        quantity,
        selectedVariant,
        attributes: [{key: 'Order Type', value: 'Sample'}],
      },
    ]
  : [];
```

```jsx
// ProductForm.jsx:512-539
const wholesaleLines = selectedColors.flatMap(
  ({name: color, sizes}) =>
    Object.entries(sizes)
      .filter(([, qty]) => qty > 0)
      .map(([sizeName, qty]) => {
        const variant = variants.find(
          (v) =>
            v.selectedOptions?.find(
              (o) => o.name === 'Color' && o.value === color,
            ) &&
            v.selectedOptions?.find(
              (o) => o.name === 'Size' && o.value === sizeName,
            ),
        );
        return variant
          ? {
              merchandiseId: variant.id,
              quantity: qty,
              selectedVariant: variant,
              attributes: [
                {key: '_color', value: color},
                {key: '_order_type', value: 'wholesale'},
              ],
            }
          : null;
      })
      .filter(Boolean),
);
```

Note the attribute key inconsistency: sample lines tag `{key: 'Order Type', value: 'Sample'}`
(human-readable key/value), wholesale lines tag `{key: '_order_type', value: 'wholesale'}` plus
a separate `{key: '_color', value: color}` (underscore-prefixed, lowercase). This asymmetry is
pre-existing and anything reading cart line attributes downstream needs to handle both shapes.

Totals:

```jsx
// ProductForm.jsx:541-552
const wholesaleTotal = wholesaleLines
  .reduce((sum, line) => {
    const variant = variants.find((v) => v.id === line.merchandiseId);
    return (
      sum + parseFloat(variant?.price?.amount ?? 0) * line.quantity
    );
  }, 0)
  .toFixed(2);

const sampleTotal = selectedVariant?.price?.amount
  ? (parseFloat(selectedVariant.price.amount) * quantity).toFixed(2)
  : '0.00';
```

Disabled/availability gating:

```jsx
// ProductForm.jsx:564-573
const sampleAvailable =
  !!selectedVariant?.availableForSale &&
  (selectedVariantQty === null ||
    (selectedVariantQty > 0 && quantity <= selectedVariantQty));

const lines = orderType === 'sample' ? sampleLines : wholesaleLines;
const isDisabled =
  orderType === 'sample'
    ? !selectedVariant || !sampleAvailable
    : wholesaleLines.length === 0 || anyColorBelowMOQ;
```

Button label logic (ProductForm.jsx:582-588): `ADDED TO CART` (transient, 500ms) →
sample: `SOLD OUT` or `ADD TO CART - $total` → wholesale: always `ADD TO CART - $total`
(wholesale has no explicit sold-out label; an empty/invalid cart just disables the button).

## Downstream effects in the parent route (context, not to be missed)

`orderType` and `selectedColors` also drive the product image gallery ordering/filtering in
the parent — this is coupled to `ProductForm`'s state even though it lives outside it:

```jsx
// products.$handle.jsx:170-191
const productImages = useMemo(() => {
  if (orderType === 'wholesale') {
    const colorImages = [...selectedColors]
      .reverse()
      .flatMap(({name: color}) =>
        allProductImages.filter(
          (img) => img.altText?.toLowerCase() === color.toLowerCase(),
        ),
      );
    const nonColorImages = allProductImages.filter((img) => !img.altText);
    return [...colorImages, ...nonColorImages];
  }
  return allProductImages
    .sort((a, b) => (b.altText != null ? 1 : 0) - (a.altText != null ? 1 : 0))
    .filter((img) => {
      if (selectedVariant && img.altText)
        return selectedVariant.selectedOptions
          .map((s) => s.value.toLowerCase())
          .includes(img.altText.toLowerCase());
      return true;
    });
}, [orderType, selectedColors, allProductImages, selectedVariant]);
```

Any simplification of `ProductForm`'s state shape (e.g. changing what `selectedColors` looks
like) must also update this.

## Summary of complexity sources (candidates for simplification)

1. **Single component, two modes.** Every render path (`renderValue`, `ColorOptionGrid`,
   `SizeOptionGrid`, add-to-cart) branches on `orderType`, rather than having distinct
   sample/wholesale subcomponents or a mode-specific hook.
2. **Two parallel "selection" representations.** Sample mode's selection lives in the URL via
   `selectedVariant`; wholesale mode's lives in `selectedColors` local state. They don't share a
   data model even though conceptually both represent "what's chosen."
3. **Cart line construction always computes both `sampleLines` and `wholesaleLines`** every
   render inside an IIFE, even though only one is ever used.
4. **Inconsistent cart attribute shape** between sample (`Order Type`/`Sample`) and wholesale
   (`_order_type`/`_color`).
5. **`selectedColors` shape conflates identity and quantity** (`{name, sizes}`), requiring
   `.find`/`.filter`/`.reduce` gymnastics in multiple places to answer simple questions ("is this
   color selected", "what's the total for this color").
6. **Parent-owned state read deeply by the child** — `ProductForm` receives `orderType`,
   `setOrderType`, `selectedColors`, `setSelectedColors` as props rather than owning/encapsulating
   its own selection state, and the parent's image gallery logic depends on the child's state
   shape.
