# Contract: `FloatingContact`

Location: `src/components/public/FloatingContact/index.tsx` (new). No props — pure
presentational, constants owned internally.

## Constants (own the phone numbers, single source each)

```text
ZALO_PHONE = '0987 654 321'   // placeholder — see spec.md Assumptions
HOTLINE_PHONE = '1900 6789'   // must match the header's existing hotline text
```

## Rendered output

| Link    | Label         | Visible number | `href`                                                | Target                                     |
| ------- | ------------- | -------------- | ----------------------------------------------------- | ------------------------------------------ |
| Zalo    | "Chat Zalo"   | `0987 654 321` | `https://zalo.me/0987654321` (digits only, no spaces) | `_blank`, with `rel="noopener noreferrer"` |
| Hotline | "Gọi hotline" | `1900 6789`    | `tel:19006789` (digits only)                          | same tab (default)                         |

Both are `Button asChild` wrapping an `<a>`, rounded full, stacked vertically
(hotline below Zalo, per the reference screenshot), fixed to the viewport's
bottom-right corner, unaffected by page scroll.

## Non-goals

- No CMS field, no Payload global, no on/off toggle (spec.md FR-006).
- No rendering under `/admin` — guaranteed by placement (root layout), not a runtime
  check (see research.md).
- No new color tokens — `default` (blue) and `brand` (orange) `Button` variants only.
