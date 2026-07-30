export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// querySelectorAll matches hidden elements too (e.g. an element sharing a
// className with a visible one but sitting behind a `hidden` attribute) —
// filter to what's actually visible and focusable, or .focus() silently
// no-ops on a display:none element.
export function getVisibleFocusable(container) {
  return container
    ? Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      )
    : [];
}
