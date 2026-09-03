# Standing invariants

Constraints in this repo that **break silently**: violate one and the code still compiles,
still passes review, still renders a 200. Only the data or the output is wrong. No linter,
type checker, or test catches these — which is why they get re-broken by whoever touches the
code next.

## What gets in

An entry must satisfy **all three**:

1. **Breaks silently.** Violating it does not throw, does not fail a build, does not turn a
   test red. If a guard already catches it, it does not belong here — noise makes the file
   go unread.
2. **Forward-facing.** It constrains code that has not been written yet, anywhere in the
   repo — not just the spot where it was discovered. Feature-local detail does not qualify.
3. **Currently true.** It describes how the code behaves _now_.

House style, naming conventions, and commit process are **not** invariants. Those live in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## This is not a changelog

Only current law is recorded here. When a change makes an entry obsolete, **rewrite or delete
it in that same commit**. Never leave the old rule beside the new one, and never keep a
"previously this was…" note for comparison — git has the history.

> A stale invariant is worse than a missing one, because it will still be believed.

Line numbers drift. Treat every `file:line` as a starting point and trust the **symbol name**
it names.

---

## Access control and data exposure

### Front-end reads of `pages` and `posts` must pass `overrideAccess: false` (or `overrideAccess: draft`)

**Rule** — Every `payload.find` / `payload.findByID` that renders content to a public visitor
must pass `overrideAccess: false`. On a route that supports draft preview, pass
`overrideAccess: draft` so an authenticated previewer still sees drafts and nobody else does.

**Why it breaks silently** — Payload's Local API defaults `overrideAccess` to **`true`**, i.e.
skip access control. `authenticatedOrPublished` is the _only_ thing that adds
`_status: { equals: 'published' }` to the query, so omitting the flag does not error — it
quietly widens the result set. The page renders 200, the layout is correct, the markup is
valid; it just contains posts nobody published yet. Nothing in the response says so.

**Where** — `src/access/authenticatedOrPublished.ts:3` (`authenticatedOrPublished`, the
`_status` filter at :8). Every call site currently conforms:
`src/app/(frontend)/[slug]/page.tsx:22` and `:104` (`queryPageBySlug`),
`src/app/(frontend)/posts/[slug]/page.tsx:24` and `:98` (`queryPostBySlug`),
`src/app/(frontend)/posts/page.tsx:21`,
`src/app/(frontend)/posts/page/[pageNumber]/page.tsx:33` and `:76`,
`src/blocks/ArchiveBlock/Component.tsx:33` (`ArchiveBlock`), both sitemap routes at `:16`.

### The front end reads `post.populatedAuthors`, never `post.authors`

**Rule** — Render bylines from `populatedAuthors`. Do not read `post.authors` in any front-end
component, and do not "simplify" it to `authors` with a depth bump.

**Why it breaks silently** — `users` has `read: authenticated`, so for an anonymous request
Payload's relationship population is filtered by access control and `authors` comes back as
bare IDs rather than user objects. It does not throw and it does not return an error field —
`author.name` is simply `undefined`, so the byline renders as an empty string and the page
looks like a post that has no author. The `populateAuthors` afterRead hook exists precisely to
copy `{ id, name }` past that boundary — its `name` is read from the user's `fullName` field,
so renaming that field silently blanks every byline. GraphQL also refuses to return mutated
user data that differs from the schema, which is why the copy lives in its own field instead.

**Where** — `src/collections/Users/index.ts` (`read: authenticated` in `access`; the
`fullName` field the byline is copied from), `src/collections/Posts/hooks/populateAuthors.ts`
(`populateAuthors`, `name: authorDoc.fullName`, and the comment explaining the boundary),
`src/collections/Posts/index.ts:197` (`populatedAuthors` field, `admin.disabled`), consumed at
`src/heros/PostHero/index.tsx:12` (`PostHero`).

## Cache invalidation

### Every `revalidateTag(X)` must match an `unstable_cache` tag `X` character for character

**Rule** — A cache tag is a bare string shared across two files. When you add, rename, or
template a tag, change the producer and the consumer together. Tags currently in use:
`pages-sitemap`, `posts-sitemap`, `global_header`, `global_footer`, `redirects`.

**Why it breaks silently** — `revalidateTag` on a tag no cache entry carries is a **no-op**. It
does not throw and it does not warn. The hook still runs to completion and still logs its
success line (`Revalidating header`), the admin still shows the document as saved, and the
editor has every reason to believe the change went live. The site then serves the stale cached
copy indefinitely.

**Where** — Producers: `src/collections/Pages/hooks/revalidatePage.ts:19` (`revalidatePage`),
`src/collections/Posts/hooks/revalidatePost.ts:19` (`revalidatePost`),
`src/Header/hooks/revalidateHeader.ts:9` (`revalidateHeader`),
`src/Footer/hooks/revalidateFooter.ts:9` (`revalidateFooter`),
`src/hooks/revalidateRedirects.ts:8` (`revalidateRedirects`). Consumers:
`src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts:47` (`getPostsSitemap`),
`src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts:60` (`getPagesSitemap`),
`src/utilities/getGlobals.ts:25` (`getCachedGlobal`, tag `global_${slug}`),
`src/utilities/getRedirects.ts:25` (`getCachedRedirects`).

> `src/utilities/getDocument.ts:30` (`getCachedDocument`) tags entries `${collection}_${slug}`
> and **nothing revalidates that tag** — the exact failure this rule prevents, already present.

### A page's public URL is `/` when its slug is `home`, and `pages` carry no collection prefix

**Rule** — Anywhere you build a URL for a `pages` document: map slug `home` to `/`, and emit no
`/pages` segment. `posts` do get a `/posts` prefix. This rule is duplicated in six places;
adding a seventh means getting it right there too.

**Why it breaks silently** — In the revalidation direction there is no feedback at all:
`revalidatePath('/home')` succeeds, because Next does not check whether a route serves that
path. The hook logs `Revalidating page at path: /home`, the editor sees a successful save, and
`/` keeps serving the old homepage forever. In the link direction it degrades to a 404 —
visible, but only to whoever clicks it.

**Where** — `src/collections/Pages/hooks/revalidatePage.ts:14` (`revalidatePage`, also :24 and
:37), `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts:50`,
`src/app/(frontend)/[slug]/page.tsx:48` (the `slug = 'home'` default),
`src/utilities/generatePreviewPath.ts:4` (`collectionPrefixMap`, `pages: ''`),
`src/components/public/Link/index.tsx:38` (`CMSLink`),
`src/components/public/PayloadRedirects/index.tsx:31` (`PayloadRedirects`, also :35).

## Config-to-component wiring

### A new `blockType` must be registered in `blockComponents`

**Rule** — Adding a block to a collection's `blocks` field is half the job. Register its `slug`
in the `blockComponents` map in the same commit.

**Why it breaks silently** — The lookup is guarded by `blockType in blockComponents`, and
TypeScript narrows `blockType` through the `in` operator, so an unregistered block produces
**no type error**. At runtime the guard fails and the branch falls through to `return null`.
The block appears in the admin UI, the editor fills it in, the document saves, and the front
end renders nothing where it should be. There is no console warning and no failed render.

**Where** — `src/blocks/RenderBlocks.tsx:11` (`blockComponents`), the `in` guard at :32, the
silent `return null` at :44.

### Admin components referenced by string path require `pnpm generate:importmap`

**Rule** — Payload config references admin components as strings
(`'@/components/admin/RowLabel/Header#RowLabel'`). After adding, moving, or renaming one, run
`pnpm generate:importmap` and commit the regenerated `importMap.js`.

**Why it breaks silently** — The reference is a **string literal**, so TypeScript never
resolves it and never complains. `importMap.js` is the only thing that turns it into a real
import. Without an entry, Payload falls back to its default rendering for that slot: the row
label shows a generic index instead of the nav item's own label, the dashboard renders without
the custom panel. The admin panel loads fine and the build succeeds.

**Where** — `src/Header/config.ts:24` and `src/Footer/config.ts:24` (the string paths),
resolved by `src/app/(payload)/admin/importMap.js:57` (`importMap`, generated), wired at
`src/payload.config.ts:31` (`admin.importMap.baseDir`).

### Any field `CardPostData` reads must be listed in `Posts.defaultPopulate`

**Rule** — `CardPostData` and `Posts.defaultPopulate` describe the same set of fields. Widen
`CardPostData` (or read a new field inside `Card`) only together with `defaultPopulate`.

**Why it breaks silently** — `CardPostData` is `Pick<Post, …>`, so TypeScript asserts every
picked field is present. But when a post arrives through a _relationship_ — `relatedPosts`, or
an archive block's `selectedDocs` — Payload populates only what `defaultPopulate` selects. The
extra field is `undefined` at runtime while the type says otherwise. `Card` guards most values
with `&&`, so it renders a card that is simply missing its image, or its category line, with
no error anywhere.

**Where** — `src/components/public/Card/index.tsx:11` (`CardPostData`),
`src/collections/Posts/index.ts:41` (`defaultPopulate`). Relationship-fed consumers:
`src/blocks/RelatedPosts/Component.tsx:27` (`RelatedPosts`),
`src/components/public/CollectionArchive/index.tsx:21` (`CollectionArchive`).

## Client-side state

### `themeLocalStorageKey` and `defaultTheme` exist in two modules — change both or neither

**Rule** — These two constants are declared twice. The writer imports one copy, the two readers
import the other. Until the duplication is collapsed into a single module, any change to the
key or the default must land in both files in the same commit.

**Why it breaks silently** — Both copies are plain strings, so a divergence is not a type error
and nothing at build time compares them. The pre-hydration `InitTheme` script would read a key
that `ThemeProvider` never writes, silently fall through to `getImplicitPreference()`, and set
`data-theme` from the OS setting instead. The site still renders in a valid theme — it just
ignores the user's saved choice, and `<html>` carries `suppressHydrationWarning`, so React will
not flag the mismatch either.

**Where** — Copy A: `src/providers/Theme/shared.ts:3` (`themeLocalStorageKey`, `defaultTheme`
at :5), imported by the **writer** `src/providers/Theme/index.tsx:8` (`ThemeProvider`, writes
at :34 and :36). Copy B: `src/providers/Theme/ThemeSelector/types.ts:3` (same two names),
imported by the **readers** `src/providers/Theme/InitTheme/index.tsx:4` (`InitTheme`, reads at
:30) and `src/providers/Theme/ThemeSelector/index.tsx:16` (`ThemeSelector`, reads at :26).

## Theming

### A region that must stay dark sets `data-theme="dark"`; it never reaches for `bg-black`

**Rule** — Heroes over a photo, the editor bar, a code block: anything deliberately dark in
both themes wraps in `data-theme="dark"` and then uses ordinary token classes
(`bg-background text-foreground`). The attribute re-scopes every custom property for the
subtree, and Tailwind's utilities compile to `var(--token)` rather than a baked hex, so the
dark values apply.

**Why it breaks silently** — `bg-black text-white` produces the same picture today and quietly
leaves the palette: change the tokens and that region does not follow. It is also invisible to
review, because white and black read as neutral defaults rather than colour decisions.
`theme-guard` now catches them, but only after this repo carried 14 such colours across five
files (`AdminBar`, `Footer`, both heroes, `Code`) under a guard reporting zero violations —
the keyword colours end in a word, and the palette rule was shaped around `family-number`.

**Where** — `src/heros/HighImpact/index.tsx`, `src/heros/PostHero/index.tsx`,
`src/components/public/AdminBar/index.tsx`, `src/blocks/Code/Component.client.tsx`, the
`KEYWORD_COLOURS` constant in `scripts/theme-guard.mjs`, and the "deliberately dark region"
section of [`DESIGN.md`](DESIGN.md).

### `--primary` is a surface, not a text colour — links take `--link`

**Rule** — Never paint text or an icon with `--primary` against the page background. It is a
fill for `bg-primary`, paired with `--primary-foreground`. Anything that reads as a link takes
`--link`.

**Why it breaks silently** — `--primary` is deliberately the same blue in light and dark, so
against the dark page background it sits at **2.75:1**, below WCAG AA. In light mode the same
class is 6.30:1 and looks perfect, so the defect only exists in one theme and never throws.
The button's `link` variant shipped this way, and the header nav renders exactly that variant;
`--link` in the same position is 8.59:1.

**Where** — `src/components/public/ui/button.tsx` (the `link` variant),
`src/Header/Nav/index.tsx` (the search icon), the `PAIRS` list in
`tests/unit/repo/component-roles.spec.ts`, which excludes `primary` as a foreground and says
why.

### `--accent` is a hover surface; the brand orange is `--brand-accent`

**Rule** — `bg-accent` / `text-accent-foreground` paint shadcn's subtle hover-and-focus
state, a pale blue. The signature orange lives at `--brand-accent`. Reach for `accent`
because you want "the accent colour" and you will get the wrong one.

**Why it breaks silently** — both names resolve, both compile, both render a colour, and
`theme-guard` is satisfied because neither is hardcoded. The SpeakEdge export this palette
came from used `--accent` for the orange, so anyone reading `design/src/` — or carrying a
habit from a stock shadcn project, where `--accent` is a near-white neutral — will map the
name onto the wrong role. The failure looks like a design choice: a ghost button that flares
bright orange on hover instead of tinting.

**Where** — `src/app/(frontend)/globals.css` (`--accent`, `--brand-accent`), the "Colors"
section of [`DESIGN.md`](DESIGN.md), and the consumers that fix the meaning:
`src/components/public/ui/button.tsx:16,18` (`hover:bg-accent`) and
`src/components/public/ui/select.tsx:99` (`focus:bg-accent`).

### Semantic colour tokens are pale surfaces; their `-foreground` partner is the readable one

**Rule** — `--success`, `--warning`, `--error` and `--destructive` are background tints. Text
and borders take the `-foreground` partner: `bg-success text-success-foreground`, and
`border-success-foreground` — never `border-success`.

**Why it breaks silently** — this is the reverse of stock shadcn, where `--destructive` is
the saturated colour and the `-foreground` is what sits on top of it. Copy any shadcn recipe
and `border-destructive` still produces a valid, rendered border — just a near-white one on a
near-white card, which reads as "no border" and never fails anything.

**Where** — `src/app/(frontend)/globals.css` (the four pairs and the `@source inline`
entries that keep the classes generated), `src/blocks/Banner/Component.tsx:17-19`, and the
"Semantic colours are background-first" section of [`DESIGN.md`](DESIGN.md).

### A dependency that ships its own CSS keeps its own palette until every one of its variables is mapped to a token

**Rule** — When adding a package that brings its own stylesheet — a typography plugin, a
component library, a chart or map library — map _all_ of its colour variables onto the
tokens in `globals.css`. Mapping some of them is not partial success: every one you leave
alone keeps the vendor's colour.

**Why it breaks silently** — `theme-guard` reads this project's source and never opens
`node_modules`, so it reports `0 violations` no matter how much vendor colour is on the
page. Nothing fails, nothing warns, and the result looks deliberate because vendor
palettes are tasteful greys. Only opening the real page in both light and dark reveals it.
A neutral palette hides it completely: while this project's tokens were placeholder
greyscale, the plugin's grey ramp blended in perfectly and looked correct.

`@tailwindcss/typography` is the worked example. It defines 36 `--tw-prose-*` variables;
all 36 are now mapped in `tailwind.config.mjs`, and `tests/unit/repo/prose-tokens.spec.ts`
reads the installed package to enumerate them, so a plugin upgrade that adds a 37th turns
red rather than quietly reintroducing vendor grey. Copy that shape for the next dependency:
enumerate from the package, do not hand-list.

Two things a role's `invert-` twin must respect: it points at the **same** token, because
the tokens already flip on `[data-theme='dark']` and `dark:prose-invert` would otherwise
layer a second flip and paint dark-mode text in light-mode colours.

`tests/unit/repo/theme-tokens.spec.ts` catches only the narrower failure next door: a
`var(--x)` naming a token that does not exist. A variable that is never mapped at all is
invisible to it, because there is nothing to dangle.

**Where** — `tailwind.config.mjs` (the 36 mappings and the header explaining them),
`src/app/(frontend)/globals.css` (the token file), the "Rich text (prose)" table in
[`DESIGN.md`](DESIGN.md), `src/components/public/RichText/index.tsx:74` (`enableProse`,
`dark:prose-invert`), and the blind-spot note in the header of `scripts/theme-guard.mjs`.

## Identifiers

### Document IDs are numbers here — never test a relationship value with `typeof x === 'string'`

**Rule** — To tell an unpopulated relationship from a populated one, check for the object:
`typeof value === 'object'`. Never branch on `typeof value === 'string'`, and never treat
an ID as a string when building a URL or a cache key.

**Why it breaks silently** — The adapter decides the ID type, and `postgresAdapter` issues
`integer` primary keys. A `typeof value === 'string'` branch is therefore simply never
entered: no error, no warning, the `else` runs instead and produces an empty slug, a URL
like `/posts/`, or a lookup that never happens. TypeScript is no help — it narrows the
branch to `never` and lets the dead code stand, so `pnpm typecheck` passes.

The idiom is everywhere in this codebase because it began as the MongoDB template, where
IDs really were strings. `src/payload-types.ts` was generated against Mongo too and
declared `id: string` throughout until it was regenerated.

**Where** — `src/payload.config.ts:60` (`postgresAdapter`),
`src/payload-types.ts` (`defaultIDType: number`). Two branches that can no longer run:
`src/components/public/PayloadRedirects/index.tsx:26` (`PayloadRedirects`) and
`src/blocks/RelatedPosts/Component.tsx:25` (`RelatedPosts`).

## Agent tooling

### A git worktree with no `.codegraph/` of its own answers from the parent repo's index

**Rule** — Every worktree needs its own index before CodeGraph is trusted there.
`.claude/hooks/codegraph-session-start.mjs` builds one on session start, so this holds by
itself for worktrees Claude Code opens. A worktree made by hand and used without a session —
or one opened after that hook is removed — does not get that, and must be indexed with
`codegraph init` before its answers mean anything.

**Why it breaks silently** — CodeGraph resolves a project by walking up from the working
directory, so a worktree nested under `.claude/worktrees/` finds the **parent checkout's**
index instead of failing. Measured: from an unindexed worktree, `codegraph status` reports
`Project: …/coursely` with 189 files — the main checkout — while the worktree's own tree is
never consulted. Nothing warns. The tool answers confidently about symbols and call paths from
a different branch, and `codegraph explore` prints them under a banner promising "verbatim,
current on-disk source". Once indexed, the same command reports the worktree's own path and
file count, and the two indexes stay independent.

**Where** — `.claude/hooks/codegraph-session-start.mjs` (the `existsSync` guard on
`.codegraph`, and the `shell: true` that makes the spawn work at all on Windows).
`.gitignore:28` (`.codegraph/`) keeps each index per-checkout. Upstream: colbymchenry/codegraph#155.
