// A gallery that silently stops being complete is worse than no gallery: it is read as an
// inventory, so a component missing from it reads as a component that does not exist.
// Nothing about adding a component to `design/` or `public/ui/` makes the page notice.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const GALLERY = 'src/app/(frontend)/components/page.client.tsx'
const SOURCES = ['src/components/design', 'src/components/public/ui', 'src/components/public/forms']

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (name.endsWith('.tsx')) acc.push(path.split('\\').join('/'))
  }
  return acc
}

/** `src/components/design/ui/avatar.tsx` → `@/components/design/ui/avatar` */
const importPathOf = (file: string): string =>
  `@/${file.replace(/^src\//, '').replace(/\.tsx$/, '')}`

const gallerySource = (): string => readFileSync(GALLERY, 'utf8')

describe('the component showcase', () => {
  it('covers every component in design/ and public/ui', () => {
    const source = gallerySource()
    const components = SOURCES.flatMap((dir) => walk(dir))
    const missing = components
      .map(importPathOf)
      .filter((path) => !source.includes(path))
      .map((path) => `${path} is not shown on /components`)

    expect(components.length).toBeGreaterThan(20)
    expect(missing).toEqual([])
  })

  it('labels every entry with a path that resolves to a real file', () => {
    // The gallery is only useful if a reader can copy the import straight out of it, so a
    // typo in `path:` is a real defect — it renders happily and sends the reader nowhere.
    //
    // Whether the path is actually *displayed* is not checkable here: it appears in the
    // import statement and again in the `path:` field whether or not anything renders it.
    // `tests/unit/components/showcase.spec.tsx` owns that half, by reading the rendered DOM.
    const real = new Set(SOURCES.flatMap((dir) => walk(dir)).map(importPathOf))
    const declared = [...gallerySource().matchAll(/^\s*path:\s*'([^']+)'/gm)].map((m) => m[1])

    expect(declared.length).toBeGreaterThan(20)
    expect(declared.filter((path) => !real.has(path))).toEqual([])
  })
})
