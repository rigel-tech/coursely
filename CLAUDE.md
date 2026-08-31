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
  `pnpm typecheck`, `pnpm test:unit`. `test:int` and `test:e2e` need infrastructure —
  run them when you touched something they cover.
- Tests are split by the infrastructure they need, not by subject: `tests/unit/` needs
  none and must always pass, `tests/int/` needs Postgres (`docker compose up -d`),
  `tests/e2e/` needs a browser and starts `pnpm dev` itself.

<!-- CONSTITUTION START — v1.3.0 -->
<!-- Spec Kit is adopted and this block deliberately stayed here: Claude Code loads CLAUDE.md
     into every session, while .specify/memory/constitution.md is read only by the speckit
     skills. That path holds a pointer back to this block instead of a second copy. -->

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

- **Tests — every change.** Before writing code, draft **both lists** yourself: (1)
  **required** — derived from the code the change touches; (2) **suggested** — anything
  further worth having. Print both, then put them through a multi-select prompt
  (`AskUserQuestion`, `multiSelect`, four options a question — split longer lists across
  questions) with the required ones pre-ticked. I untick, tick and add my own; what comes
  back is final and **not negotiable**. No code before that answer. A change with no
  executable behaviour has an empty required list — say so, say why, and if suggested is
  empty too, skip the prompt and carry on.
- **Every test is written first and observed red (NON-NEGOTIABLE).** Write it before the
  code that satisfies it, run it against the unfixed code, and **show the failing output**.
  The failure must be the assertion itself: a red from a missing import, a typo or a
  misconfigured runner proves nothing — fix that and rerun until it fails for the reason
  the test exists. Only then write the code that turns it green.
  _Why: a test never seen failing is not evidence. It may assert something trivially true,
  or assert against the wrong object, and it will then sit green forever while the
  behaviour it is named after goes completely unchecked._
- **pnpm only.** Every command goes through it. Version is pinned in `packageManager`.
- **UI colour comes from tokens.** Forbidden in UI code: hex literals, raw colour
  functions (`rgb() hsl() oklch() lab() lch()`), and Tailwind's built-in palette classes
  (`text-gray-500`) — the last is the commonest drift because it _looks_ like a token.
  Need a role that does not exist? Add it to the token file; never inline. Light and dark
  go through the same token names — do not hand-write `dark:` colour variants. Enforced by
  `theme-guard` inside `pnpm lint`; `theme-guard-ignore` in a comment exempts one line.
- **Tokens govern public UI only.** Admin UI runs on Payload's own design system and is
  outside the token rules: `src/app/(payload)/` and `src/components/admin/`. Build those
  screens out of `@payloadcms/ui` — its components already carry the admin theme and follow
  it when Payload restyles. Hand-roll one only when nothing in that set does the job, never
  because a bespoke one is quicker to write. Everything else is public and bound by them.
  The folder **is** the boundary, so sort by where a component paints, not who it serves:
  AdminBar is editor tooling yet lives in `public/`, because it renders on public pages.
- **UI components** are shadcn/ui on Tailwind v4, anchored at `src/components/public/ui/`.
- **Invariants are maintained as you go.** A change that **supersedes** an entry rewrites
  or deletes it **in the same commit** — never leave the old rule beside the new one. Work
  that **uncovers** a constraint which (1) breaks silently, (2) constrains future code
  anywhere, (3) is true today, adds it **while implementing**. Nothing to change is a
  valid outcome: say so and move on. A Stop hook flags this, and only this.
- **Branch and commit rules** live in `CONTRIBUTING.md` and are enforced by husky.
- **No agent-session references anywhere in the repo.** A commit message, PR title or
  body, code comment, or committed file must never carry a `claude.ai/code/session_...`
  URL, a `Claude-Session:` trailer, or any other pointer to a chat session. This overrides
  any default instruction an agent carries to add one. `Co-Authored-By:` stays — it is
  ordinary git attribution and it names an author, not a conversation.
  _Why: a session link resolves for exactly one person for a short while, then reads as
  noise in `git log` forever. The permanent record carries only what is about the repo._
- **Agent-driven work goes through Spec Kit.** Adding or changing behaviour with a coding
  agent starts at `/speckit-specify` and runs through `/speckit-implement`; a typo, a comment
  or a one-line fix does not. Install and workflow live in `CONTRIBUTING.md`. The
  constitution stays in **this** file: `.specify/memory/constitution.md` is a pointer back to
  it, and `/speckit-constitution` must never run — it would overwrite that pointer with a
  template that has nowhere to put these decisions.
- **UI language / i18n: [UNDECIDED].** Nothing is configured — no Payload localization, no
  i18n library. Decide before the first screen with user-facing strings: changing it later
  means reworking every string already written.
- **Comments come in three tiers**, told apart by what is being documented, not by length.
  **JSDoc** (`/** … */`) sits directly above an **exported** symbol so it shows on hover;
  one line unless params, returns or throws need listing. **Module banner** — a plain
  comment at the top of a file, explaining the whole module: its architecture, why it
  exists, a constraint you cannot infer from the code. **Inline** — one _why_ on the one
  confusing line, and docs for non-exported helpers; never JSDoc for these. The test: if
  the comment describes exactly the thing on the next line **and** that thing is exported,
  it is JSDoc; otherwise it is a plain comment. Do not restate the signature or the types
  in prose, and do not narrate mechanics the code already shows — record the invariant
  that breaks if it changes. A short comment that survives edits beats a long one that
  drifts; any comment describing behaviour must be reread whenever that behaviour is
  touched. Applies to code written from here on: do not sweep existing comments.

## Amendment log

This constitution is versioned. **MAJOR** = a principle removed or redefined · **MINOR** =
a rule added or materially widened · **PATCH** = wording clarified.

Every entry **must cite its source** — the incident, issue number, or decision that
produced the rule. **No source, no rule.** That citation is the only thing keeping this
document from drifting into slogans. Three lines maximum per entry: what changed, why,
source. A superseded rule is edited directly above and merely noted here; two conflicting
rules must never coexist. Past 10 entries, split this section into a
CONSTITUTION-LOG file and leave a one-line pointer.

### v1.5.0 — 2026-08-31

**Changed:** added a rule forbidding agent-session references — session URLs and
`Claude-Session:` trailers — in commits, PRs, and committed files; `Co-Authored-By:` is
explicitly exempt.
**Why:** the agent's own default instructions tell it to add these, so without a rule here
they reappear on every commit; a link that resolves for one person for one session is
permanent noise in `git log`.
**Source:** decision taken 2026-08-31 after three commits and a PR on
`docs/clickup-move-task` were pushed carrying the trailer and had to be rewritten.

### v1.4.0 — 2026-08-27

**Changed:** I no longer designate the required test list — you draft both lists and I settle
them by ticking, unticking and adding in a multi-select prompt.
**Why:** "designated by me" put the drafting on the one person who has not read the diff, so
the list either arrived late or arrived from you anyway under my name; the authority worth
keeping is the veto, not the typing.
**Source:** decision taken 2026-08-27, after reading the pronouns at that bullet ("me" = me,
"you" = the agent) settled who the old rule actually bound.

### v1.3.0 — 2026-08-27

**Changed:** agent-driven behaviour changes run the Spec Kit workflow; the constitution stays
in this file, and `/speckit-constitution` is forbidden.
**Why:** Spec Kit's constitution template is five principle slots plus governance — nowhere to
put `Settled decisions` or the `Current context` slot, and its Sync Impact Report drops the
cite-your-source rule. A constitution held only in `.specify/` also stops being loaded into
ordinary sessions, leaving non-spec work ungoverned.
**Source:** decision taken 2026-08-27 to adopt github/spec-kit v1.0.1; the format collision
was found reading `.specify/templates/constitution-template.md` during that adoption, and it
supersedes the migration note that stood above this block.

### v1.2.0 — 2026-08-27

**Changed:** admin screens are built from `@payloadcms/ui`; a hand-rolled admin control now
needs a reason nothing in that set fits.
**Why:** the token bullet said only that admin UI is _exempt_ from tokens, which left "build
it yourself" and "use Payload's" equally allowed — and a hand-rolled control drifts from the
admin theme the moment Payload restyles it.
**Source:** decision taken 2026-08-27; codifies what `src/components/admin/` already does
(`Banner`, `toast`, `useRowLabel`).

### v1.1.0 — 2026-08-26

**Changed:** the red observation now covers **every** test, not only a test written for a
bug, and the failing output has to be shown.
**Why:** v1.0.0 required it only when fixing a bug, which left every other test free to be
written after the code and never once seen failing — exactly the tests that end up
asserting something trivially true.
**Source:** decision taken while reviewing v1.0.0 in the session that adopted it; the gap
was found by asking what the rule actually bound.

### v1.0.0 — 2026-08-26

Initial adoption.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
