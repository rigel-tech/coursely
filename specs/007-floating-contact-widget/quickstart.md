# Quickstart: Validating the Floating Contact Widget

Prerequisites: `pnpm dev` running.

## Scenario 1 — visible and fixed on public pages

1. Load `/`. **Expect**: two stacked buttons at the bottom-right corner — a blue
   "Chat Zalo" pill with "0987 654 321", and below it an orange "Gọi hotline" pill
   with "1900 6789".
2. Scroll the page. **Expect**: both buttons stay fixed in the corner.
3. Load `/khoa-hoc` or any other public page. **Expect**: same widget appears.

## Scenario 2 — links work

1. Click "Chat Zalo". **Expect**: a new tab opens to `https://zalo.me/0987654321`.
2. Click "Gọi hotline". **Expect**: the browser/device offers to dial `1900 6789`
   (desktop browsers typically prompt to open a calling app, or show `tel:19006789`
   in the status bar — full dial behavior is device-dependent).

## Scenario 3 — absent on /admin

1. Load `/admin`. **Expect**: neither button appears anywhere on the screen.

## Automated coverage

`pnpm test:unit` — `tests/unit/components/floating-contact.spec.ts` renders the
component and asserts both links' `href`s and visible text.
