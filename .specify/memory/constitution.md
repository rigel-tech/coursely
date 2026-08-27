# Coursely Constitution — pointer

The constitution is **not** kept in this file. Its full text lives in
[`/CLAUDE.md`](../../CLAUDE.md), between the `CONSTITUTION START` and `CONSTITUTION END`
markers. Read that file now: it is the authority, and this one carries no rules of its own.

It lives there because Claude Code loads `CLAUDE.md` into every session automatically, while
this path is read only by the speckit skills at runtime. Holding the text here instead would
narrow the constitution to spec-driven work and leave ordinary edits — a bug fix, a review, a
one-file change — ungoverned.

**Do not run `/speckit-constitution`.** It overwrites this path with its own template: five
principle slots plus two generic sections and a governance block. That shape has nowhere to
put `Settled decisions`, nowhere for the `Current context` slot, and its Sync Impact Report
does not require an amendment to cite a source — the one rule keeping the amendment log
honest. Amend `CLAUDE.md` by hand, following the log rules written there.
