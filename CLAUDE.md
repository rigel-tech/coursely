# Coursely

Payload CMS 3 + Next.js 16 App Router, Postgres, Tailwind v4, shadcn/ui.

## Signposts

Open the file. Do not work from this page's summary of it.

| Working on                                          | Read                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Payload: collections, fields, hooks, access control | `.claude/skills/payload/SKILL.md`, then `reference/`                                              |
| Anything in an area with a silently-breaking trap   | [`INVARIANTS.md`](INVARIANTS.md)                                                                  |
| Colour, theme, tokens                               | [`src/app/(frontend)/globals.css`](<src/app/(frontend)/globals.css>) — header states the contract |
| Branches, commits, git hooks, scripts               | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                              |
| Fixing or debugging the colour guard                | [`scripts/theme-guard.mjs`](scripts/theme-guard.mjs) — header                                     |

A SessionStart hook loads the `INVARIANTS.md` entry titles into context. Knowing a trap
exists is the point; the rule itself is one read away.

## Structure & commands

- `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` are **generated**.
  Never hand-edit. Rerun `pnpm generate:types` / `pnpm generate:importmap`.
- Green before anything counts as done: `pnpm lint` (eslint **and** theme-guard),
  `pnpm typecheck`, `pnpm test:int`.
- `tests/int/**/*.int.spec.ts` is vitest; `tests/e2e/` is playwright and starts `pnpm dev`
  itself. `tests/int/api.int.spec.ts` needs Postgres up — `docker compose up -d`.

<!-- CONSTITUTION START — v1.0.0 -->
<!-- On adopting spec-kit: move this block to .specify/memory/constitution.md, delete the
     body here, and leave a one-line pointer. Full text in two places is a sync debt. -->

## Principles

**I. Think before writing code.** State assumptions out loud. Unsure — ask, do not guess.
More than one reading — present them all, never pick one silently. A simpler way exists —
say so. Something is confusing — stop, name it, and ask.
_Why: most defects and wasted effort come from unstated assumptions and silent decisions._

**II. Simple first.** The least code that solves the stated problem. Forbidden unless
explicitly asked for: features outside the request, abstraction for a single use,
"flexibility" or configuration nobody requested, error handling for cases that cannot
happen. If you wrote 200 lines where 50 would do, write it again.
_Why: speculative complexity is the largest long-term maintenance cost._

**III. Change only what was asked.** Touch what the task requires and nothing else. Do not
"improve" nearby code, comments, or formatting. Do not refactor what is not broken. Follow
the existing style even where you prefer another. Unrelated dead code: **report** it, do
not delete it. Clean up exactly the imports and variables your own change orphaned. The
test: every changed line traces back to the request.
_Why: a swollen diff makes review hard, hides intent, and widens the blast radius._

**IV. Drive to verifiable goals (NON-NEGOTIABLE).** Turn the task into checkable criteria
**before** starting. "Add validation" → "write a test for bad input, then make it pass".
"Fix a bug" → "write a test that reproduces it, then make it pass". Multi-step work: state
a short plan, each step with how it is verified. Not verified is not done.
_Why: strong criteria let you iterate without asking constantly, and make "done" mean
"checked", not "looks right"._

## Settled decisions

- **Tests — every change.** Before writing code, present **two lists**: (1) **required** —
  designated by me from the code the change touches, not negotiable; (2) **suggested** —
  you pick what you want and add your own. No code before both lists exist.
- **Bugs.** A test that reproduces the defect must be observed **red** before the fix.
- **pnpm only.** Every command goes through it. Version is pinned in `packageManager`.
- **UI colour comes from tokens.** Forbidden in UI code: hex literals, raw colour
  functions (`rgb() hsl() oklch() lab() lch()`), and Tailwind's built-in palette classes
  (`text-gray-500`) — the last is the commonest drift because it _looks_ like a token.
  Need a role that does not exist? Add it to the token file; never inline. Light and dark
  go through the same token names — do not hand-write `dark:` colour variants. Enforced by
  `theme-guard` inside `pnpm lint`; `theme-guard-ignore` in a comment exempts one line.
- **Tokens govern public UI only.** Admin UI runs on Payload's own design system and is
  outside the token rules: `src/app/(payload)/` and `src/components/admin/`. Everything
  else is public and bound by them. The folder **is** the boundary, so placing a component
  is a real decision. `admin/AdminBar` is the exception to watch — it renders on public
  pages, so use tokens there anyway; the guard will not catch you.
- **UI components** are shadcn/ui on Tailwind v4, anchored at `src/components/public/ui/`.
- **Invariants are maintained as you go.** A change that **supersedes** an entry rewrites
  or deletes it **in the same commit** — never leave the old rule beside the new one. Work
  that **uncovers** a constraint which (1) breaks silently, (2) constrains future code
  anywhere, (3) is true today, adds it **while implementing**. Nothing to change is a
  valid outcome: say so and move on. A Stop hook flags this, and only this.
- **Branch and commit rules** live in `CONTRIBUTING.md` and are enforced by husky.
- **UI language / i18n: [UNDECIDED].** Nothing is configured — no Payload localization, no
  i18n library. Decide before the first screen with user-facing strings: changing it later
  means reworking every string already written.

## Amendment log

This constitution is versioned. **MAJOR** = a principle removed or redefined · **MINOR** =
a rule added or materially widened · **PATCH** = wording clarified.

Every entry **must cite its source** — the incident, issue number, or decision that
produced the rule. **No source, no rule.** That citation is the only thing keeping this
document from drifting into slogans. Three lines maximum per entry: what changed, why,
source. A superseded rule is edited directly above and merely noted here; two conflicting
rules must never coexist. Past 10 entries, split this section into a
CONSTITUTION-LOG file and leave a one-line pointer.

### v1.0.0 — 2026-08-26

Initial adoption. No amendments yet — the first one has to come from something that
actually happened.

<!-- CONSTITUTION END -->

<!-- CONTEXT START -->

## Current context

Anything that **outlives the feature** belongs in `INVARIANTS.md`, not here. This section
holds only what is true _while_ a feature is being built, and is **deleted when it ships**.
Ten lines, hard limit.

_Empty — no feature in flight._

<!-- On adopting spec-kit: /speckit-plan writes its own block between SPECKIT markers, for
     the same job. Delete this CONTEXT block then, keep SPECKIT, and copy the ten-line
     limit and the rule above into it. spec-kit will not keep that block small for you. -->
<!-- CONTEXT END -->
