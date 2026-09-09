// A migration file that is not named in `src/migrations/index.ts` never runs in production.
//
// `prodMigrations` in `payload.config.ts` is that array — Payload does not scan the folder.
// Adding the file and forgetting the array leaves no trace: dev keeps working because dev
// pushes the schema instead of migrating, CI keeps passing because nothing runs migrations,
// and the deploy comes up against a schema that was never changed. The failure surfaces as
// "relation does not exist" from application code, far from the cause.
//
// `payload migrate:create` regenerates the array, so this guard mostly catches a file added
// or renamed by hand.

import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'

const MIGRATIONS_DIR = 'src/migrations'

const fileNames = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()

describe('every migration file is registered in prodMigrations', () => {
  it('registers exactly the files on disk, no more and no fewer', () => {
    expect(migrations.map((m) => m.name).sort()).toEqual(fileNames())
  })

  it('gives every entry a runnable up and down', () => {
    for (const m of migrations) {
      expect(typeof m.up, `${m.name}.up`).toBe('function')
      expect(typeof m.down, `${m.name}.down`).toBe('function')
    }
  })

  it('includes the students split', () => {
    expect(migrations.some((m) => /students/.test(m.name))).toBe(true)
  })

  it('finds migration files at all (an empty scan would pass forever)', () => {
    expect(fileNames().length).toBeGreaterThan(3)
  })
})
