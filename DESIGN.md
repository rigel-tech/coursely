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
  muted-foreground-subtle: '#7B8AAB'
  accent: '#E4ECFA'
  accent-foreground: '#0B2A6B'
  brand-accent: '#FF6A1A'
  brand-accent-foreground: '#FFFFFF'
  link: '#1650CF'
  heading-accent: '#0B2A6B'
  border: '#E2E8F4'
  input: '#E2E8F4'
  ring: '#1650CF'
  success: '#E9F7EE'
  success-foreground: '#17643A'
  warning: '#FFF1E8'
  warning-foreground: '#D9520B'
  error: '#FDECEC'
  error-foreground: '#B3261E'
  destructive: '#FDECEC'
  destructive-foreground: '#B3261E'
  chart-1: '#1650CF'
  chart-2: '#FF6A1A'
  chart-3: '#0B2A6B'
  chart-4: '#17643A'
  chart-5: '#7B8AAB'
  sidebar: '#FFFFFF'
  sidebar-foreground: '#101A31'
  sidebar-primary: '#1650CF'
  sidebar-primary-foreground: '#FFFFFF'
  sidebar-accent: '#E4ECFA'
  sidebar-accent-foreground: '#0B2A6B'
  sidebar-border: '#E2E8F4'
  sidebar-ring: '#1650CF'
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
  brand-accent-foreground-dark: '#FFFFFF'
  link-dark: '#84B0FF'
  heading-accent-dark: '#84B0FF'
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
  chart-1-dark: '#84B0FF'
  chart-2-dark: '#FF9E6B'
  chart-3-dark: '#5B8CE8'
  chart-4-dark: '#5FD79E'
  chart-5-dark: '#95A2C6'
  sidebar-dark: '#141B2E'
  sidebar-foreground-dark: '#F2F5FC'
  sidebar-primary-dark: '#84B0FF'
  sidebar-primary-foreground-dark: '#0B1220'
  sidebar-accent-dark: '#1E2A46'
  sidebar-accent-foreground-dark: '#F2F5FC'
  sidebar-border-dark: '#2A3350'
  sidebar-ring-dark: '#84B0FF'
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
    background: '{colors.card}'
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

The palette is derived from the SpeakEdge export in `design/src/`, with three deliberate
departures:

1. **Token names are shadcn/ui's, not SpeakEdge's.** The components in
   `src/components/public/ui/` are shadcn components and read `--background`, `--muted`,
   `--border`. Renaming the contract to `--bg-page` / `--text-muted` would mean rewriting
   every one of them for no gain.
2. **Admin colour is excluded.** SpeakEdge's `--bg-sidebar: #071B45` and its KPI, funnel and
   weekly-bar chart colours dress the CMS. Admin runs on Payload's own design system, so
   those never enter this palette.
3. **Values are hex, in both files.** The design.md spec recommends hex, and an identical
   string in two places is greppable when it drifts. The previous `oklch()` values were
   shadcn's untouched template defaults.

Not covered here: typography, radius and spacing are **documented** below but are not yet
wired into `globals.css`. Changing `--radius` reshapes every existing component, which is a
larger change than the palette and was not asked for.

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
| `muted-foreground-subtle` | `--text-subtle`           | `#7B8AAB`             | `#95A2C6`             |
| `accent`                  | `--chip-bg`               | `#E4ECFA`             | `#1E2A46`             |
| `brand-accent`            | `--accent`                | `#FF6A1A`             | `#FF6A1A`             |
| `link`                    | `--link`                  | `#1650CF`             | `#84B0FF`             |
| `heading-accent`          | `--text-accent-strong`    | `#0B2A6B`             | `#84B0FF`             |
| `primary`                 | `--primary`               | `#1650CF`             | `#1650CF`             |
| `border`, `input`         | `--border`                | `#E2E8F4`             | `#2A3350`             |
| `success` / `-foreground` | `--ok-bg` / `--ok-fg`     | `#E9F7EE` / `#17643A` | `#143324` / `#5FD79E` |
| `warning` / `-foreground` | `--warn-bg` / `--warn-fg` | `#FFF1E8` / `#D9520B` | `#3A2718` / `#FFA96B` |
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

### Brand colours do not change between themes

`primary` (`#1650CF`) and `brand-accent` (`#FF6A1A`) are identical in light and dark, as in
the export. Everything that must stay legible against a flipped background — `link`,
`heading-accent`, `ring`, the chart ramp — does change.

## Typography

Be Vietnam Pro for text, JetBrains Mono for numbers and class codes, per the export. The
scale is the export's: 11 / 12.5 / 14 / 15.5 / 18 / 22 / 30 / clamp(30–58) px.

These tokens are **documented, not yet wired**. `globals.css` currently maps `--font-sans`
and `--font-mono` to `next/font` variables (`--font-geist-sans`, `--font-geist-mono`).
Switching the actual typefaces is a separate change and needs the fonts loading through
`next/font` first.

## Layout

Container widths come from the breakpoints already in `globals.css`: 40 / 48 / 64 / 80 /
86 rem. The spacing scale above adds the export's 18 / 22 / 28 / 36 px steps, which Tailwind's
default 4px ramp does not hit.

## Shapes

Radius 6 / 9 / 14 / 99 px — small controls, cards, pills. Documented, not yet wired:
`globals.css` derives `--radius-sm|md|lg|xl` from a single `--radius`, and that arithmetic
cannot produce 6 / 9 / 14. Reconciling it changes the shape of every existing component.

## Components

See the `components:` block in the front matter. Every value there is a token reference, so
a component spec can never drift from the palette — the test resolves each `{section.token}`
and fails on a dangling one.

## Do's and Don'ts

**Do** add a new role to `:root`, `[data-theme='dark']` and `@theme inline` together. Miss
the third and the Tailwind class silently does not exist; miss the second and dark mode
silently inherits the light value. Both compile.

**Do** put the colour in this file at the same time. The test compares them.

**Don't** reach for `bg-accent` when you mean the orange. See the trap above.

**Don't** hand-write `dark:` colour variants. Light and dark go through the same token name;
that is the whole point of the contract.

**Don't** add a token because the palette "looks incomplete". `chip`, `track`, `dash-border`
and `accent-soft` exist in the export and were deliberately left out — no public screen uses
them yet. Add one when a screen needs it, not before.

**Don't** apply this palette to `src/app/(payload)/` or `src/components/admin/`. Those are
Payload's design system and are outside the token regime entirely.
