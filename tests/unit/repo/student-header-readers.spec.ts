// `proxy` used to forward the identity to Server Components as `x-user-id` /
// `x-user-status`, always deleting the inbound copies first so a client could not forge
// them. Nothing ever read them — and INVARIANTS forbids a Server Component from doing so,
// because the public pages that host the header are `force-static`, where `headers()`
// returns empty and such a component silently always looks signed-out.
//
// With the forwarding gone, an inbound `x-user-*` is now plain client input that reaches
// the app untouched. This scan is what keeps that from becoming a vulnerability: the day
// someone reintroduces a read of these headers, this fails instead of shipping a header a
// visitor can set to any account id they like.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = 'src'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

describe('nobody in src/ touches the x-user-* request headers', () => {
  const files = walk(SRC)

  it('finds no reader and no writer', () => {
    expect(files.filter((f) => /x-user-(id|status|role)/.test(readFileSync(f, 'utf8')))).toEqual([])
  })

  it('finds files at all (an empty scan would pass forever)', () => {
    expect(files.length).toBeGreaterThan(50)
  })
})
