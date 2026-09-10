// `.gitkeep` files were placeholders for folders that had no code in them yet. Every one
// of them now sits beside real modules, where the file is nothing but noise — and noise
// nobody reviews, because an empty file has nothing to read.
//
// A folder that is genuinely empty is not tracked by git at all, which is the intended
// behaviour, not a problem to paper over. This scan is what stops a keeper from being
// added back the next time someone wants an empty folder to show up in a clone.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = 'src'

const keepers = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) keepers(path, acc)
    else if (name === '.gitkeep') acc.push(path.split('\\').join('/'))
  }
  return acc
}

describe('src/ carries no .gitkeep placeholders', () => {
  it('finds none', () => {
    expect(keepers(SRC)).toEqual([])
  })
})
