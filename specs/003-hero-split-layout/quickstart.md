# Quickstart / validation: Medium hero two-column layout

## Prerequisites

- `docker compose up -d` (Postgres + Redis) for the admin, if you want to edit content.
- `pnpm dev` running.

## Automated checks

```bash
pnpm test:unit -- medium-impact-hero   # the new component test
pnpm lint                              # eslint + theme-guard (no raw colour)
pnpm typecheck
```

Expected: the new test in `tests/unit/components/medium-impact-hero.spec.tsx` passes; lint reports no new colour-token violations.

The test file must have been committed and seen **failing** before `src/heros/MediumImpact/index.tsx` was changed (constitution: every test observed red first).

## Manual visual check

1. In the admin, open (or create) the `home` Page. Hero tab → **Type: Medium Impact**. Add a heading + paragraph of rich text, one or two links, and upload an image. **Publish**.
2. Open `http://localhost:3000/`.
3. Resize the window and confirm:

   | Width           | Expected                                                                                                    |
   | --------------- | ----------------------------------------------------------------------------------------------------------- |
   | 375px           | Text (heading, paragraph, buttons) on top, image directly below. One column.                                |
   | 768px+          | Text in the left half, image in the right half, on the same row, vertically centred as a pair.              |
   | 1280px / 1920px | Same side-by-side layout; no horizontal scrollbar; image not stretched or bleeding past the container edge. |

4. Edge cases:
   - Remove the image from the hero, Publish → text block fills the width, no empty right column at any size.
   - Give the hero an image but clear the rich text and remove all links, Publish → image shows, no empty left column.
   - Add a caption to the image (media doc `caption` field) → caption renders under the image in the right column.
5. Regression: open a page using a **High Impact** hero and one using **Low Impact** — both look exactly as before.

## Rollback

Revert the single commit touching `src/heros/MediumImpact/index.tsx` and the test file. No data or config to undo.
