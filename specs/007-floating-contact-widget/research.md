# Phase 0 Research: Floating Contact Widget

No `[NEEDS CLARIFICATION]` markers in `spec.md` — the one real open question (the
actual Zalo number) was resolved with the requester before writing it, and recorded
as an explicit placeholder.

## Decision: reuse `Button`'s existing `default`/`brand` variants, no new tokens

**Decision**: The Zalo link uses `<Button asChild variant="default">`, the hotline
link uses `<Button asChild variant="brand">`, both with a `className="rounded-full"`
override (merged correctly via `cn`'s `tailwind-merge`, confirmed in
`src/utilities/ui.ts`).

**Rationale**: `src/components/public/ui/button.tsx`'s `buttonVariants` already
defines exactly the two colors the reference screenshot shows: `default` is
`bg-primary text-primary-foreground` (this site's blue) and `brand` is
`bg-brand-accent text-primary-foreground` (this site's orange, already used for the
"Đăng ký khóa học" CTA and others). Introducing a dedicated "Zalo blue" token would
mean a new `DESIGN.md` entry, a new `globals.css` light+dark pair, and updates to
three token-parity tests (`design-tokens.spec.ts`) for a color that isn't actually
this site's brand — it's a third-party chat app's brand, which this project has no
obligation to reproduce exactly.

**Alternatives considered**:

- _Add a `--brand-zalo` token pair matching Zalo's official blue (#0068FF)_ —
  rejected: this site's existing blue (`--primary`, `#1650CF`) already reads as "the
  site's blue" on this button, and matching a third-party product's exact brand color
  is not a requirement spec.md makes (its own Assumptions section explicitly rules
  this out: "No new brand color is introduced for the Zalo button").

## Decision: `lucide-react`'s `MessageCircle` for Zalo, `Phone` for hotline

**Decision**: Both icons come from `lucide-react` (already a dependency, already used
for `Bell` in `HeaderAuthControls`); no new icon library, no image asset, no
reproduction of Zalo's actual logomark.

**Rationale**: `MessageCircle` reads as "chat" without asserting it's specifically
Zalo's trademarked icon — the visible "Chat Zalo" label text already carries that
identification, same way the reference screenshot pairs a generic bubble/logo-style
icon with a text label. Avoids a licensing/trademark question the feature doesn't
need to answer.

**Alternatives considered**:

- _Inline SVG of Zalo's actual logomark_ — rejected: introduces a trademarked asset
  with no license basis found in this codebase; the text label already does the
  identifying work FR-004 requires ("MUST each display their respective phone number
  as visible text").

## Decision: placement — root layout, sibling to `Header`/`Footer`

**Decision**: `<FloatingContact />` is added to
`src/app/(frontend)/layout.tsx`'s `<Providers>` children, alongside `<Header />` and
`<Footer />` (not inside either).

**Rationale**: This layout is the `(frontend)` route group's root — every public page
renders through it, and `/admin` is a sibling route group with its own layout tree
(confirmed in `INVARIANTS.md`'s admin/public split and this repo's existing
`AdminBar` removal precedent, commit `80147ca`). Placing it here satisfies FR-005 ("MUST
NOT appear on `/admin`") structurally, with no conditional/pathname check needed —
the same reason `Header` and `Footer` themselves need no such check today.

**Alternatives considered**:

- _A pathname check inside the component itself (`usePathname().startsWith('/admin')
? null : ...`)_ — rejected as unnecessary: the component is never mounted on
  `/admin` in the first place, so a runtime check would be redundant defensive code
  for a case that structurally cannot occur (Principle II: no code for cases that
  cannot happen).

## Decision: fixed positioning via a plain wrapper, no new layout primitive

**Decision**: `FloatingContact` is a server-renderable component (no `'use client'`
needed — two `<a>`-rendered buttons, no state, no event handlers) wrapped in one
`<div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">`.

**Rationale**: Matches the reference screenshot's stacked layout; `z-50` keeps it
above ordinary page content but below the header's `z-40`... actually the header is
`sticky top-0 z-40`, and this widget sits at the opposite corner so stacking order
between the two never visibly matters, but `z-50` is chosen to be unambiguously above
regular page content (cards, sections) without needing to reason about every
existing `z-*` in the codebase precisely.

**Alternatives considered**:

- _A shared "portal/overlay root" component_ — rejected: no other floating overlay
  exists in this codebase yet (no dialogs currently use a portal pattern this would
  need to match); one `fixed` div is the least code that solves the stated problem.
