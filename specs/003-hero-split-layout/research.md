# Research: Medium hero two-column layout

Phase 0. Resolves the open choices flagged in `plan.md`.

## R1 — Breakpoint for switching to two columns

- **Decision**: Tailwind `md` (768px). Columns side by side at `md` and up; stacked below.
- **Rationale**: The rest of the codebase uses `md:` as the phone→tablet/desktop switch for layout (`page.tsx` featured-courses header `sm:flex-row`, `CollectionArchive` grid). `md` gives each column ≥ ~360px at the breakpoint, enough for a heading + paragraph next to an image.
- **Alternatives**: `lg` (1024px) — leaves tablet users with a tall stack unnecessarily; `sm` (640px) — columns get too narrow for readable rich text on small tablets.

## R2 — Column ratio

- **Decision**: `md:grid-cols-2` — equal halves.
- **Rationale**: Spec assumption SC/Assumptions fix ~50/50 with no editor control. `grid-cols-2` is the simplest expression and matches "visually balanced" (FR-005).
- **Alternatives**: `md:grid-cols-[3fr_2fr]` (text-weighted) — rejected: adds a bespoke track sizing for no requirement; revisit only on a design review.

## R3 — Vertical alignment of the two cells

- **Decision**: `md:items-center`.
- **Rationale**: When the text is shorter than the image (or vice-versa) the two should read as a pair rather than both pinned to the top with a ragged gap (FR-005).
- **Alternatives**: `md:items-start` — leaves an uneven baseline when heights differ; `md:items-stretch` (default) — stretches the image cell, distorting intrinsic aspect unless extra classes fight it.

## R4 — Behaviour when the hero has an image but no text/links, or text but no image (FR-004)

- **Decision**: Keep the existing guards. The media cell is only rendered when `media` is an object (guard already present). Add the **same** guard around the text cell: render it only when `richText` **or** `links` is present. When only one cell exists, add `md:[&>*]:col-span-2` on the grid container is **not** used; instead, when a cell is absent the remaining cell naturally sits in column 1 — acceptable per "the text column fills the available width" is satisfied by dropping to a single-column flow: use `md:grid-cols-2` only when **both** cells are present.
- **Concrete rule**: compute `hasText = Boolean(richText) || (Array.isArray(links) && links.length > 0)` and `hasMedia = media && typeof media === 'object'`. Apply `md:grid-cols-2 md:items-center` only when `hasText && hasMedia`; otherwise the container stays a single column (`grid gap-8`) and whichever cell exists spans it.
- **Rationale**: Directly satisfies FR-004 ("MUST NOT reserve or show an empty column") without arbitrary-variant selectors, and keeps the DOM free of an empty cell.
- **Alternatives**: Always emit both cells + `grid-cols-2`, blanking the empty one — rejected: shows an empty half-width gutter, violates FR-004. Arbitrary selector `[&>*:only-child]:col-span-2` — works but less legible than a boolean on the className.

## R5 — `Media` bleed classes inside a grid cell

- **Decision**: Drop the full-bleed negative margins (`-mx-4 md:-mx-8 2xl:-mx-16`) that the stacked layout used; render `<Media imgClassName="rounded-lg" />` (or no imgClassName) constrained to its grid cell.
- **Rationale**: Negative horizontal margins were there to let the image break out of the `container` when it was full width. In a half-width grid cell they would pull the image under the text column and out past the viewport edge — a horizontal-scroll risk (SC-004) and visually wrong.
- **Alternatives**: Keep the bleed only on the `< md` stacked case via `max-md:` variants — rejected: adds responsive complexity for a look nobody asked to preserve; "change only what was asked".

## R6 — Outer wrapper and duplicated `container`

- **Decision**: Replace the outer `<div className="">` + two inner `container` divs with a single `<div className="container ...">` grid. Removes the empty-string className and the duplicate `container`.
- **Rationale**: These are orphaned by the restructure (the two children merge into one grid), so cleaning them is "imports and variables your own change orphaned", not a drive-by.
- **Alternatives**: Leave the empty `<div className="">` — rejected: it becomes a pointless wrapper around the grid.

## R7 — Test strategy for a Server Component that renders `RichText` / `Media`

- **Decision**: Unit test with `@testing-library/react` (jsdom), following `tests/unit/components/badge.spec.tsx`. Render `<MediumImpactHero>` with:
  - a minimal `links` array of one `custom` link (no `richText`, no `media`) → assert the container class list and that the links `<ul>` is in the DOM;
  - `media` omitted → assert no media cell, no throw;
  - both a fake `richText` (minimal Lexical root: `{ root: { type: 'root', children: [] } }`) and `links` → assert the text cell precedes any media region in `compareDocumentPosition` / DOM order.
  - `Media` is not exercised with a real resource in unit tests (needs next/image + a payload doc); the "image right column" placement is covered by `quickstart.md` visual checks.
- **Rationale**: Keeps the unit test fast and free of next/image and Payload; asserts exactly the class output and source order the change is responsible for.
- **Alternatives**: Playwright e2e — heavier; better suited to the SC-004 no-scroll check, deferred to quickstart manual for now since no hero e2e harness exists.

## Summary of resolved unknowns

| Item            | Resolution                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| Breakpoint      | `md` (768px)                                                                    |
| Ratio           | `grid-cols-2` (50/50)                                                           |
| Alignment       | `md:items-center`                                                               |
| One-cell case   | container is single-column unless `hasText && hasMedia`; no empty cell rendered |
| Media bleed     | removed inside the grid cell                                                    |
| Wrapper cleanup | collapse to one `container` grid div                                            |
| Tests           | vitest + RTL, class + DOM-order assertions; visual checks in quickstart         |
