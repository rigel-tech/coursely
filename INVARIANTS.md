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
copy `{ id, name }` past that boundary. GraphQL also refuses to return mutated user data that
differs from the schema, which is why the copy lives in its own field instead.

**Where** — `src/collections/Users/index.ts:11` (`read: authenticated`),
`src/collections/Posts/hooks/populateAuthors.ts:4` (`populateAuthors`, and the comment
explaining the boundary), `src/collections/Posts/index.ts:197` (`populatedAuthors` field,
`admin.disabled`), consumed at `src/heros/PostHero/index.tsx:12` (`PostHero`).

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

### A dependency that ships its own CSS keeps its own palette until every one of its variables is mapped to a token

**Rule** — When adding a package that brings its own stylesheet — a typography plugin, a
component library, a chart or map library — map _all_ of its colour variables onto the
tokens in `globals.css`. Mapping some of them is not partial success: every one you leave
alone keeps the vendor's colour.

**Why it breaks silently** — `theme-guard` reads this project's source and never opens
`node_modules`, so it reports `0 violations` no matter how much vendor colour is on the
page. Nothing fails, nothing warns, and the result looks deliberate because vendor
palettes are tasteful greys. Only opening the real page in both light and dark reveals it.
Live in this repo today: `@tailwindcss/typography` defines 36 `--tw-prose-*` variables
from its own slate/gray ramps, `tailwind.config.mjs` overrides 2 of them, and both of
those point at `var(--text)` — a token that is defined nowhere. So every `prose` surface
draws most of its colour from the plugin, and the whole `prose-invert` dark set is
untouched.

**Where** — `tailwind.config.mjs:9` (`--tw-prose-body`, `--tw-prose-headings`),
`src/app/(frontend)/globals.css` (the token file — grep it for `--text` and find nothing),
`src/components/public/RichText/index.tsx:74` (`enableProse`), and the blind-spot note in the
header of `scripts/theme-guard.mjs`.
