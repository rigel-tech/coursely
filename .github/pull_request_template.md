<!-- Every box below is a rule from CLAUDE.md or CONTRIBUTING.md, not a formality.
     One that does not apply: strike it through and say why in a few words.
     Do not tick a box you did not check. -->

## What and why

<!-- The change in a sentence or two, and the problem it solves. Link the issue. -->

## Tests

**Required** — designated from the code this change touches, not negotiable:

-

**Suggested** — the author's own:

-

<!-- A change with no executable behaviour has an empty required list: say so, and say why. -->

- [ ] Every test above was written first and **observed red**, and the red was the assertion
      itself — not a missing import, a typo, or a misconfigured runner.

## Green

- [ ] `pnpm lint` — eslint **and** theme-guard
- [ ] `pnpm typecheck`
- [ ] `pnpm test:unit`
- [ ] `pnpm test:int` / `pnpm test:e2e` — run if this touches what they cover; if not, name which and why

## Invariants

- [ ] Touched a file `INVARIANTS.md` names → re-read that entry and confirmed it still holds
      as written
- [ ] An entry this change supersedes was rewritten or deleted **in the same commit**, and a
      constraint it uncovered was added while implementing — or there was nothing to change,
      which is a valid outcome

## Scope

- [ ] Every changed line traces back to the request: no drive-by refactor, no reformatting,
      no unrelated dead code deleted (report that instead)
- [ ] `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` were regenerated, not
      hand-edited
- [ ] Public UI colour comes from tokens; admin UI is built from `@payloadcms/ui`

## Spec Kit

<!-- Agent-driven work that adds or changes behaviour: link specs/<feature>/.
     Anything else — a typo, a comment, a dependency bump, a one-line fix — delete this section. -->
