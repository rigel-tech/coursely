// `src/components/design/` is a waiting room, not a library. Components land there fully
// built and design-system-compliant, and move into `src/components/public/` the day a screen
// needs one. Four properties keep it a waiting room rather than a second component tree, and
// none of them is visible to the compiler:
//
//   - a component with no JSDoc is unusable without reading its source
//   - one that imports payload-types is welded to a collection that may not exist yet
//   - one that shares a name with a public/ui component gets imported by mistake
//   - one imported directly from a page has skipped the move, and the folder has quietly
//     stopped being a waiting room
//
// All four compile, render and pass lint.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESIGN_DIR = 'src/components/design'
const PUBLIC_UI_DIR = 'src/components/public/ui'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

const designFiles = (): string[] => walk(DESIGN_DIR)

const sourceOf = (file: string): string => readFileSync(file, 'utf8')

/** Exported components and hooks — the symbols a caller can actually reach for. */
const exportedSymbols = (source: string): string[] => [
  ...new Set([
    ...[...source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Z]\w*)/gm)].map((m) => m[1]),
    ...[...source.matchAll(/^export\s+const\s+([A-Z]\w*)/gm)].map((m) => m[1]),
  ]),
]

describe('the design staging folder', () => {
  it('holds the components it is supposed to hold', () => {
    // Without this every check below passes on an empty directory.
    const components = designFiles().filter((f) => f.endsWith('.tsx'))
    expect(components.length).toBeGreaterThanOrEqual(10)
  })

  it('documents every component it exports', () => {
    const undocumented: string[] = []

    for (const file of designFiles()) {
      const source = sourceOf(file)
      for (const symbol of exportedSymbols(source)) {
        // The JSDoc must sit immediately above the export, which is where an editor looks.
        const declaration = new RegExp(
          String.raw`\*/\s*\n\s*export\s+(?:async\s+)?(?:function|const)\s+${symbol}\b`,
        )
        if (!declaration.test(source)) undocumented.push(`${file}: ${symbol}`)
      }
    }

    expect(undocumented).toEqual([])
  })

  it('stays independent of the Payload schema', () => {
    // These components describe their own props. Reaching into payload-types would tie one
    // to a collection this project has not built yet, and the move into public/ would then
    // be blocked on the data model rather than on a screen wanting it.
    const coupled = designFiles()
      .filter((file) => /from\s+['"][^'"]*(payload-types|\/collections)/.test(sourceOf(file)))
      .map((file) => `${file} imports the Payload schema`)

    expect(coupled).toEqual([])
  })

  it('never shadows a component that public/ui already provides', () => {
    const taken = new Set(
      readdirSync(PUBLIC_UI_DIR)
        .filter((f) => f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx$/, '')),
    )
    const shadowed = designFiles()
      .map((file) =>
        file
          .split('/')
          .pop()!
          .replace(/\.tsx?$/, ''),
      )
      .filter((name) => taken.has(name))
      .map((name) => `${name} already exists in ${PUBLIC_UI_DIR}`)

    expect(taken.size).toBeGreaterThan(5)
    expect(shadowed).toEqual([])
  })

  it('is imported by nothing outside itself', () => {
    // The promotion step is moving the file. An import that reaches in from a page skips it,
    // and the folder silently becomes a second place components live.
    const outside = walk('src').filter((f) => !f.startsWith(`${DESIGN_DIR}/`))
    const reachingIn = outside
      .filter((file) =>
        /from\s+['"][^'"]*(@\/components\/design|components\/design)/.test(sourceOf(file)),
      )
      .map((file) => `${file} imports from ${DESIGN_DIR}`)

    expect(outside.length).toBeGreaterThan(20)
    expect(reachingIn).toEqual([])
  })
})
