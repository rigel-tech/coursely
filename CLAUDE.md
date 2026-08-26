# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see `.claude/skills/payload/reference/` for detailed docs.

## Design tokens

Public UI takes colour, spacing and typography from tokens in
[`src/app/(frontend)/globals.css`](<src/app/(frontend)/globals.css>). In UI code the
following are **forbidden**:

- hex literals (`#fff`, `#0a0a0a`)
- raw colour functions (`rgb()`, `rgba()`, `hsl()`, `oklch()`, `lab()`, `lch()`)
- Tailwind's built-in palette classes (`text-gray-500`, `bg-slate-900`, …) — these are the
  commonest way UI drifts off-theme, because they _look_ like tokens

Need a colour role that does not exist? Add it to the token file — never inline it. Handle
light and dark through the same token names; do not hand-write `dark:` colour variants.

The values in that file are placeholders. **The token name is the contract, the colour is
not** — so this rule works now, before any design direction is settled, and settling it
later stays a value-only diff in one file.

Enforced by [`scripts/theme-guard.mjs`](scripts/theme-guard.mjs), which runs in
`pnpm lint`. A genuinely unavoidable colour (a third-party brand, say) can carry
`theme-guard-ignore` in a comment on that line. Its 9 behaviours are pinned by
`tests/int/theme-guard.int.spec.ts`.

> **A green guard is not evidence that a page is on-theme.** It never opens
> `node_modules`, so a dependency's own CSS is invisible to it — including a live case in
> this repo. See the entry on vendor stylesheets in [`INVARIANTS.md`](INVARIANTS.md).

## Standing invariants

[`INVARIANTS.md`](INVARIANTS.md) records the constraints in this repo that **break
silently** — violate one and the code still compiles, still passes review, still renders a
200, and only the data or the output is wrong. No linter, type checker, or test catches
them.

**Read the relevant entry before changing code in an area it covers.** A SessionStart hook
loads the entry titles into context; the rules themselves are one read away.

### Maintenance obligation

This is a standing rule, not a suggestion:

- When a change **supersedes** an entry, rewrite or delete that entry **in the same
  commit**. Never leave the old rule beside the new one — a stale invariant is worse than a
  missing one, because it will still be believed.
- When work **uncovers** a new constraint that (1) breaks silently, (2) constrains future
  code anywhere in the repo, and (3) is true today, add it **while implementing**, not
  later.
- If none of the entries you touched need changing, that is a valid outcome — say so and
  move on.

A Stop hook flags this, but only when the session changed a file `INVARIANTS.md` points at
and left `INVARIANTS.md` alone. It is deliberately quiet otherwise.
