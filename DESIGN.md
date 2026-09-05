---
version: alpha
name: Coursely Public
description: >-
  The public website palette, derived from the SpeakEdge design export. Admin surfaces are
  out of scope: they run on Payload's own design system.
colors:
  # Light theme. Every `<name>-dark` below is the same role under [data-theme='dark'].
  # Names are shadcn/ui role names, not SpeakEdge names — see "Colors" for the mapping.
  background: '#F4F6FB'
  foreground: '#101A31'
  card: '#FFFFFF'
  card-foreground: '#101A31'
  popover: '#FFFFFF'
  popover-foreground: '#101A31'
  primary: '#1650CF'
  primary-foreground: '#FFFFFF'
  secondary: '#F8FAFD'
  secondary-foreground: '#101A31'
  muted: '#F2F6FD'
  muted-foreground: '#41527A'
  muted-foreground-subtle: '#5B6B8C'
  accent: '#E4ECFA'
  accent-foreground: '#0B2A6B'
  brand-accent: '#FF6A1A'
  brand-accent-foreground: '#101A31'
  link: '#1650CF'
  heading-accent: '#0B2A6B'
  hero-accent: '#0B2A6B'
  border: '#E2E8F4'
  input: '#E2E8F4'
  ring: '#1650CF'
  success: '#E9F7EE'
  success-foreground: '#17643A'
  warning: '#FFF1E8'
  warning-foreground: '#B8440A'
  error: '#FDECEC'
  error-foreground: '#B3261E'
  destructive: '#FDECEC'
  destructive-foreground: '#B3261E'
  background-dark: '#0B1220'
  foreground-dark: '#F2F5FC'
  card-dark: '#141B2E'
  card-foreground-dark: '#F2F5FC'
  popover-dark: '#141B2E'
  popover-foreground-dark: '#F2F5FC'
  primary-dark: '#1650CF'
  primary-foreground-dark: '#FFFFFF'
  secondary-dark: '#1B2438'
  secondary-foreground-dark: '#F2F5FC'
  muted-dark: '#172038'
  muted-foreground-dark: '#B4C0DE'
  muted-foreground-subtle-dark: '#95A2C6'
  accent-dark: '#1E2A46'
  accent-foreground-dark: '#F2F5FC'
  brand-accent-dark: '#FF6A1A'
  brand-accent-foreground-dark: '#101A31'
  link-dark: '#84B0FF'
  heading-accent-dark: '#84B0FF'
  hero-accent-dark: '#1650CF'
  border-dark: '#2A3350'
  input-dark: '#2A3350'
  ring-dark: '#84B0FF'
  success-dark: '#143324'
  success-foreground-dark: '#5FD79E'
  warning-dark: '#3A2718'
  warning-foreground-dark: '#FFA96B'
  error-dark: '#3A1B1B'
  error-foreground-dark: '#FF9B93'
  destructive-dark: '#3A1B1B'
  destructive-foreground-dark: '#FF9B93'
typography:
  display:
    fontFamily: var(--font-sans)
    fontSize: clamp(30px, 6.2vw, 58px)
    fontWeight: 700
    lineHeight: 1.08
  headline-lg:
    fontFamily: var(--font-sans)
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.1
  headline-md:
    fontFamily: var(--font-sans)
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
  headline-sm:
    fontFamily: var(--font-sans)
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.45
  body-lg:
    fontFamily: var(--font-sans)
    fontSize: 15.5px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: var(--font-sans)
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label-md:
    fontFamily: var(--font-sans)
    fontSize: 12.5px
    fontWeight: 500
    lineHeight: 1.5
  label-sm:
    fontFamily: var(--font-sans)
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: var(--font-mono)
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  # `default` backs the bare `rounded` class and matches `md`, the control radius.
  default: 9px
  sm: 6px
  md: 9px
  lg: 14px
  full: 99px
spacing:
  xs: 4px
  sm: 8px
  md: 18px
  lg: 22px
  xl: 28px
  2xl: 36px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    typography: '{typography.label-md}'
  button-brand:
    background: '{colors.brand-accent}'
    # Deliberately `primary-foreground` (white), not `brand-accent-foreground` (the ink,
    # #101A31, chosen for its 6.04:1 contrast — see "Every pair must clear WCAG AA"). White on
    # this orange is 2.87:1, below AA for body text. `Badge`'s brand variant still uses
    # `brand-accent-foreground`, so it still passes; only the button strayed from the pair on
    # purpose.
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    typography: '{typography.label-md}'
  button-ghost:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
  card:
    background: '{colors.card}'
    foreground: '{colors.card-foreground}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  badge-success:
    background: '{colors.success}'
    foreground: '{colors.success-foreground}'
    radius: '{rounded.full}'
  badge-warning:
    background: '{colors.warning}'
    foreground: '{colors.warning-foreground}'
    radius: '{rounded.full}'
  badge-error:
    background: '{colors.error}'
    foreground: '{colors.error-foreground}'
    radius: '{rounded.full}'
  input:
    # No background of its own: the control is transparent so it takes whichever surface it
    # is placed on, card or muted alike.
    foreground: '{colors.foreground}'
    border: '{colors.input}'
    placeholder: '{colors.muted-foreground-subtle}'
    radius: '{rounded.md}'
---

# Coursely — Public Design System

## Overview

This document is the source of truth for the **public** website palette. The compiled copy
lives in [`src/app/(frontend)/globals.css`](<src/app/(frontend)/globals.css>); the two are
held in step by `tests/unit/repo/design-tokens.spec.ts`, which fails if a single hex string
drifts. Edit both together, or edit this file and let the test tell you what you missed.

The palette came out of a one-off Claude Design export ("SpeakEdge") that has since been
thrown away. Everything worth keeping from it is in this file — nothing here depends on that
export still existing. Three deliberate departures from what it shipped:

1. **Token names are shadcn/ui's, not SpeakEdge's.** The components in
   `src/components/public/ui/` are shadcn components and read `--background`, `--muted`,
   `--border`. Renaming the contract to `--bg-page` / `--text-muted` would mean rewriting
   every one of them for no gain.
2. **Admin colour is excluded.** The export's navy sidebar (`#071B45`) and its KPI, funnel
   and weekly-bar chart colours dressed the CMS. Admin runs on Payload's own design system,
   so those never entered this palette — and shadcn's own `--chart-*` and `--sidebar-*`
   defaults were removed for the same reason: this site has no chart and no sidebar, and
   nothing painted with those thirteen roles.
3. **Values are hex, in both files.** The design.md spec recommends hex, and an identical
   string in two places is greppable when it drifts. The previous `oklch()` values were
   shadcn's untouched template defaults.

Every scale below reaches the page, and each is pinned to this document by a named test —
so a claim here cannot quietly stop being true:

| Scale      | Where it lands                              | Held by                                            |
| ---------- | ------------------------------------------- | -------------------------------------------------- |
| Colour     | `:root` / `[data-theme='dark']`             | `design-tokens.spec.ts`, `component-roles.spec.ts` |
| Typeface   | `next/font` → `--font-sans` / `--font-mono` | `fonts.spec.ts`                                    |
| Type sizes | `@theme` `--text-*`                         | `type-scale.spec.ts`                               |
| Radius     | `@theme` `--radius*`                        | `shape-scale.spec.ts`                              |
| Spacing    | nothing to wire — Tailwind generates it     | `shape-scale.spec.ts`                              |
| Elevation  | `--elevation-*` → `@theme inline`           | `elevation-scale.spec.ts`                          |

The type sizes were the last to arrive, and the reason the table exists: this paragraph
claimed typography was live while `globals.css` declared no `--text-*` at all, so all 64
`text-*` uses in the project were taking Tailwind's ladder instead. A sentence is not a
guarantee; the right-hand column is.

## Colors

### Where each colour came from

| This palette              | SpeakEdge source          | Light                 | Dark                  |
| ------------------------- | ------------------------- | --------------------- | --------------------- |
| `background`              | `--bg-page`               | `#F4F6FB`             | `#0B1220`             |
| `foreground`              | `--text`                  | `#101A31`             | `#F2F5FC`             |
| `card`, `popover`         | `--bg-surface`            | `#FFFFFF`             | `#141B2E`             |
| `secondary`               | `--bg-surface-2`          | `#F8FAFD`             | `#1B2438`             |
| `muted`                   | `--bg-soft`               | `#F2F6FD`             | `#172038`             |
| `muted-foreground`        | `--text-muted`            | `#41527A`             | `#B4C0DE`             |
| `muted-foreground-subtle` | `--text-muted-2`          | `#5B6B8C`             | `#95A2C6`             |
| `accent`                  | `--chip-bg`               | `#E4ECFA`             | `#1E2A46`             |
| `brand-accent`            | `--accent`                | `#FF6A1A`             | `#FF6A1A`             |
| `link`                    | `--link`                  | `#1650CF`             | `#84B0FF`             |
| `heading-accent`          | `--text-accent-strong`    | `#0B2A6B`             | `#84B0FF`             |
| `primary`                 | `--primary`               | `#1650CF`             | `#1650CF`             |
| `hero-accent`             | _none — added here_       | `#0B2A6B`             | `#1650CF`             |
| `border`, `input`         | `--border`                | `#E2E8F4`             | `#2A3350`             |
| `success` / `-foreground` | `--ok-bg` / `--ok-fg`     | `#E9F7EE` / `#17643A` | `#143324` / `#5FD79E` |
| `warning` / `-foreground` | `--warn-bg` / `--warn-fg` | `#FFF1E8` / `#B8440A` | `#3A2718` / `#FFA96B` |
| `error`, `destructive`    | _none — added here_       | `#FDECEC` / `#B3261E` | `#3A1B1B` / `#FF9B93` |

### `accent` is not the orange

The single trap in this palette. shadcn's `--accent` is a **hover and focus surface** —
`hover:bg-accent` in `button.tsx`, `focus:bg-accent` in `select.tsx`. SpeakEdge's `--accent`
is a **brand colour**, the signature orange. They collide on the name and mean opposite
things: one is nearly invisible, one shouts.

So `accent` keeps shadcn's meaning (pale blue chip surface) and the orange lives at
`brand-accent`. Painting a hover state with `bg-brand-accent` is a design decision; painting
one with `bg-accent` is the default. Do not swap them.

### Semantic colours are background-first

`success`, `warning`, `error` and `destructive` are each a **pair**: the base token is a pale
tint meant for a surface, and `-foreground` is the readable text or border on top of it.
A badge is `bg-success text-success-foreground`. A border wants `border-success-foreground`,
not `border-success` — the base is far too pale to read as a line.

This is the reverse of stock shadcn, where `--destructive` is the saturated colour. It is
also why `Banner` changed: `border-error bg-error/30` became `border-error-foreground
bg-error`.

`error` and `destructive` carry the same values on purpose. `destructive` is shadcn's name,
used by `button.tsx`, `input.tsx`, `select.tsx` and the form error; `error` is the name the
`Banner` block and the `@source inline` entries already used. Neither is dead, so neither
was deleted.

### A deliberately dark region sets `data-theme="dark"`, it does not reach for black

Heroes over a photo, the editor bar, a syntax-highlighted code block — regions that stay dark
whatever the page theme is. The way to express that is `data-theme="dark"` on the wrapper,
which re-scopes every token for the subtree, and then ordinary token classes inside:
`bg-background text-foreground` render the dark values.

Reaching for `bg-black text-white` instead produces the same picture and loses the contract:
the region no longer follows the palette, and `theme-guard` did not see it, because a rule
built around `family-number` walks straight past the keyword colours. That is how this repo
carried 14 hardcoded colours across five files under a guard reporting zero violations. The
guard now catches `white` and `black`; `transparent`, `current` and `inherit` stay legal
because they name no colour of their own.

### Every pair must clear WCAG AA in both themes

`tests/unit/repo/component-roles.spec.ts` computes the contrast of each foreground/background
pair the components actually put together and fails below 4.5:1. Three values were set by that
test rather than by taste:

| Role                              | Was       | Is        | Why                                                                           |
| --------------------------------- | --------- | --------- | ----------------------------------------------------------------------------- |
| `brand-accent-foreground`         | `#FFFFFF` | `#101A31` | White on the orange is 2.87:1. The palette's own ink is 6.04:1                |
| `warning-foreground` (light)      | `#D9520B` | `#B8440A` | 3.68:1 on the warning tint, below AA for body text                            |
| `muted-foreground-subtle` (light) | `#7B8AAB` | `#5B6B8C` | 3.20:1 on the page, and this role is documented for captions — which are text |

`--primary` is exempt as a foreground: it is a surface role, it is deliberately the same blue
in both themes, and it sits at 2.75:1 on the dark page background. Text that reads as a link
takes `--link`, which does flip.

### Brand colours do not change between themes

`primary` (`#1650CF`) and `brand-accent` (`#FF6A1A`) are identical in light and dark, as in
the export. Everything that must stay legible against a flipped background — `link`,
`heading-accent`, `ring`, the chart ramp — does change.

### `hero-accent` is a surface, and it does flip

Full-bleed hero/banner sections (the student profile banner is the first) want the same
strong navy the `heading-accent` text uses in light mode, not `primary`'s brand blue.
`heading-accent` itself cannot be reused as a background: in dark mode it flips to `#84B0FF`
(light blue), a colour meant to read as text on the dark page, not to sit under white text
as a filled surface. `hero-accent` is a distinct role for exactly that job — `#0B2A6B` in
light mode (matching `heading-accent`), `#1650CF` in dark mode (matching `primary`, so a
banner painted with it in dark mode looks like the rest of the brand blue chrome). Pair it
with `primary-foreground` for text, the same as `primary` itself.

## Typography

Be Vietnam Pro for text, JetBrains Mono for numbers and class codes. The scale is the
export's: 11 / 12.5 / 14 / 15.5 / 18 / 22 / 30 / clamp(30–58) px.

Both load through `next/font/google` in `src/app/(frontend)/layout.tsx` and reach the page
as `--font-be-vietnam-pro` and `--font-jetbrains-mono`, which `globals.css` reads into
`--font-sans` and `--font-mono`. `tests/unit/repo/fonts.spec.ts` holds that chain together:
nothing else does, because the variables are injected at runtime and so look dangling to the
token tests.

**Both families request the `vietnamese` subset.** Skipping it does not fail — accented
characters simply fall out to a fallback face mid-word, which reads as a rendering glitch.
Geist, which this replaced, did cover the Vietnamese codepoints; the change is a design
decision, not a repair.

Be Vietnam Pro is not a variable font, so weights are loaded individually: **400, 500, 600,
700** — exactly the four the tokens above use. Adding a fifth token weight means adding it in
`layout.tsx` too, or the browser fakes it. JetBrains Mono is variable and ships its whole
range in one file.

### Scale

The eight tokens map one-to-one onto Tailwind's size ladder, so `text-sm` means `label-md`
and nothing has to learn a second vocabulary.

| Token         | Size                     | Line height | Class       |
| ------------- | ------------------------ | ----------- | ----------- |
| `label-sm`    | 11px                     | 1.4         | `text-xs`   |
| `label-md`    | 12.5px                   | 1.5         | `text-sm`   |
| `body-md`     | 14px                     | 1.55        | `text-base` |
| `body-lg`     | 15.5px                   | 1.6         | `text-md`   |
| `headline-sm` | 18px                     | 1.45        | `text-lg`   |
| `headline-md` | 22px                     | 1.25        | `text-xl`   |
| `headline-lg` | 30px                     | 1.1         | `text-2xl`  |
| `display`     | clamp(30px, 6.2vw, 58px) | 1.08        | `text-3xl`  |

`text-md` does not exist in stock Tailwind; the design has eight steps and the default ladder
has seven, so it is declared here. Every step also declares its own
`--text-…--line-height`: Tailwind keeps its own ratio for any size that omits one, which puts
correctly-sized text on the wrong rhythm and reads as a spacing bug rather than a token one.

Anything outside these eight fails `tests/unit/repo/type-scale.spec.ts`. That matters more
here than elsewhere, because until this was wired `globals.css` declared no `--text-*` at all
and all 64 uses in the project were quietly taking Tailwind's ladder — of which only
`text-lg` agreed with the design.

**Headings carry no size of their own.** `globals.css` resets `h1`–`h6` to
`font-size: unset`, so an `<h2>` is 14px until a step is put on it. That is deliberate — it
stops the document outline and the visual hierarchy from being the same decision — but it
means every heading needs an explicit class.

## Layout

Container widths come from the breakpoints already in `globals.css`: 40 / 48 / 64 / 80 /
86 rem.

**The spacing scale needs no configuration, and that was checked rather than assumed.**
Tailwind v4 generates spacing utilities on demand as `calc(var(--spacing) * n)` with
`--spacing: 0.25rem`, and it accepts fractional `n`. Every step above is reachable out of the
box — `p-4.5` is 18px, `p-5.5` is 22px, `p-7` is 28px, `p-9` is 36px — confirmed in a real
build, where `p-4.5` compiles to `calc(var(--spacing) * 4.5)`. Do not add a spacing config;
there is nothing for it to do.

## Elevation & Depth

Four steps, and unlike every other scale here they are **not** the same in both themes.

| Step        | Light      | Dark         | Used for                                   |
| ----------- | ---------- | ------------ | ------------------------------------------ |
| `shadow-xs` | ink at 6%  | black at 40% | Resting controls — input, checkbox, button |
| `shadow-sm` | ink at 9%  | black at 45% | Cards at rest                              |
| `shadow-md` | ink at 10% | black at 50% | Hover lift, select menu                    |
| `shadow-lg` | ink at 12% | black at 55% | Dialogs                                    |

"Ink" is the palette's own `#101a31` rather than pure black, so a shadow on a blue-tinted
surface stays in the family instead of going grey.

**Why dark needs its own values, and this is the whole point of the section.** Tailwind's
shadows are `rgb(0 0 0 / 0.05–0.25)`, static across themes. Composite a 10% black shadow over
the dark page background `#0B1220` and the result is `#0A101D` — one or two levels per
channel. Invisible. Every card, dialog and hover lift in this project had no elevation in
dark mode at all, and nothing reported it, because the shadow does render — it just cannot be
seen. Dark therefore uses pure black at four to five times the alpha, which reads against a
dark ground the way a soft ink shadow reads against a light one.

The values are declared as `--elevation-*` in `:root` and `[data-theme='dark']`, then exposed
as `--shadow-*` through `@theme inline` — exactly the shape the colour roles use, so the two
scales are read the same way. `tests/unit/repo/elevation-scale.spec.ts` fails if a step is
missing from either theme, and specifically if a step is _identical_ in both: that is the
regression back to invisible, and it is not otherwise detectable.

Only these four exist. `shadow-xl` and `shadow-2xl` fall back to Tailwind's own values and
are outside the system.

## Shapes

Radius 6 / 9 / 14 / 99 px — small controls, cards, pills — declared as literals in the
`@theme` block of `globals.css`.

They are literals because the shadcn template derived the whole scale from a single
`--radius` with `calc()`, and 6 / 9 / 14 is not an arithmetic run: no single base produces
it. The derivation was quietly giving 6 / 8 / 10 / 14 instead, so `rounded-md` and
`rounded-lg` were both a size the design never asked for.

`rounded` with no suffix is a real level — three blocks use it — so it is declared as
`default` and matches `md`. `rounded-full` has no entry: Tailwind's own pill value already
is the intent. Anything outside these levels fails
`tests/unit/repo/shape-scale.spec.ts`, including an arbitrary `rounded-[0.8rem]`, which is
what `Form`, `MediaBlock` and `checkbox` were using before this scale existed.

## Components

See the `components:` block in the front matter. Every value there is a token reference, so
a component spec can never drift from the palette — the test resolves each `{section.token}`
and fails on a dangling one.

### Rich text (prose)

Everything the CMS produces renders through `@tailwindcss/typography`, which defines its own
36 `--tw-prose-*` colour variables and fills them from a slate/gray ramp. `theme-guard` never
opens `node_modules`, so unmapped ones stay vendor grey and nothing reports it. All 36 are
mapped in `tailwind.config.mjs`; the table is the 18 roles, and each role's `invert-` twin
points at the same token because our tokens already flip with the theme.

| Role            | Token                       |
| --------------- | --------------------------- |
| `body`          | `--foreground`              |
| `headings`      | `--heading-accent`          |
| `lead`          | `--muted-foreground`        |
| `links`         | `--link`                    |
| `bold`          | `--foreground`              |
| `counters`      | `--muted-foreground`        |
| `bullets`       | `--muted-foreground-subtle` |
| `hr`            | `--border`                  |
| `quotes`        | `--foreground`              |
| `quote-borders` | `--border`                  |
| `captions`      | `--muted-foreground`        |
| `kbd`           | `--foreground`              |
| `kbd-shadows`   | `--border`                  |
| `code`          | `--heading-accent`          |
| `pre-code`      | `--foreground`              |
| `pre-bg`        | `--muted`                   |
| `th-borders`    | `--border`                  |
| `td-borders`    | `--border`                  |

Roles follow the plugin's own structure rather than taste: it gives `code` the same weight as
`headings`, makes `bullets` lighter than `counters`, and keeps all four border roles on one
tone. The one departure is `pre-bg` — the plugin hardcodes a dark code block even in light
mode, ours follows the theme.

## Do's and Don'ts

**Do** add a new role to `:root`, `[data-theme='dark']` and `@theme inline` together. Miss
the third and the Tailwind class silently does not exist; miss the second and dark mode
silently inherits the light value. Both compile.

**Do** put the colour in this file at the same time. The test compares them.

**Don't** reach for `bg-accent` when you mean the orange. See the trap above.

**Don't** hand-write `dark:` colour variants. Light and dark go through the same token name;
that is the whole point of the contract.

**Don't** add a token because the palette "looks incomplete". The export also carried `chip`,
`track`, `dash-border` and `accent-soft`; they were left out because no public screen uses
them. Add one when a screen needs it, not before.

**Don't** apply this palette to `src/app/(payload)/` or `src/components/admin/`. Those are
Payload's design system and are outside the token regime entirely.
