# Staging components

Components that are **built and waiting**, not components that are in use.

Everything here is finished work: design-system compliant, documented, and ready to render.
What it is missing is a screen that wants it. When one appears, the component **moves** into
`src/components/public/` — it is not imported from where it sits.

## Finding a component

0. Open `/components` — every component in the project, rendered live, labelled with its
   import path and whether it is ready or still staged.
1. Look in `src/components/public/ui/` first. If it is there, use it.
2. If not, look here.
3. If it is here, **move the file** into `src/components/public/`, then import it.
4. If it is in neither, build it in `public/` — nothing lands here just to wait.

`/components` is the one route allowed to import from this folder: it documents the
components rather than shipping them, and a gallery that cannot show an unpromoted
component is not a gallery. That hole is held to exactly that route by
`tests/unit/repo/design-staging.spec.ts`.

## Why moving, not importing

`tests/unit/repo/design-staging.spec.ts` fails if anything outside this folder imports from
it. Without that rule the folder quietly becomes a second place components live, with no
answer to "which one is real". Moving the file makes the promotion visible in a diff, and
leaves this folder honestly describing what is still unused.

## What lands here

| Rule                                                  | Why                                                                                                                                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No import from `@/payload-types` or `src/collections` | These describe their own props. Several of them are for `Courses`, `Classes` and `Teachers`, which this project has not built yet; coupling to a schema would block the move on the data model instead of on a screen wanting it. |
| No name already taken by `public/ui/`                 | Two components with one name gets the wrong one imported, and it still compiles.                                                                                                                                                  |
| JSDoc with a real `@example` on every export          | Nothing renders these yet, so the doc comment is the only usage there is.                                                                                                                                                         |
| Tokens only, radius scale only                        | Same rules as public UI — `theme-guard` and `shape-scale.spec.ts` cover this folder too.                                                                                                                                          |

## Moving one out

Move the file, update its imports, and check what it pulls in: several components here
import each other (`CourseList` uses `CourseCard` and `EmptyState`, `ClassRoster` uses
`Avatar`). Move the dependencies with it, or the import test fails on the one left behind.
