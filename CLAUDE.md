# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see `.claude/skills/payload/reference/` for detailed docs.

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
