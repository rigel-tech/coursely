// Renaming the public course URL from /courses to /khoa-hoc is only real if every
// link the site itself renders was updated — this asserts that as a static fact
// about the source tree, so it needs no browser and no server (see the sibling
// import-boundaries.spec.ts for the same reasoning).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const FILES = [
  'src/globals/Header/Nav/index.tsx',
  'src/app/(frontend)/page.tsx',
  'src/app/(frontend)/courses/page.tsx',
  'src/app/(frontend)/courses/[slug]/page.tsx',
  'src/components/public/CourseFilters/index.tsx',
  'src/components/public/forms/ProfileForm.tsx',
]

/** The one documented exception: a CMS redirects-collection lookup key, not a rendered link. */
const EXEMPT_LINE = "const url = '/courses/' + decodedSlug"

const offendingLines = (file: string): string[] =>
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('/courses') && line.trim() !== EXEMPT_LINE)

describe('course URL rename', () => {
  it('leaves no route-facing /courses literal outside the one documented exception', () => {
    const offenders = FILES.flatMap((file) =>
      offendingLines(file).map((line) => `${file}: ${line.trim()}`),
    )
    expect(offenders).toEqual([])
  })

  it('actually read all six files (an empty scan would pass vacuously)', () => {
    for (const file of FILES) {
      expect(() => readFileSync(file, 'utf8')).not.toThrow()
    }
  })
})
