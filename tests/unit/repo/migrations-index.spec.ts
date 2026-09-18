import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'

/**
 * `pnpm payload migrate` reads migration files straight off disk, but the
 * prod migrate-at-startup path reads only this file's `migrations` array —
 * the two can silently diverge (a migration commented out or dropped here
 * still exists on disk, still passes CI, but never runs against a fresh DB).
 */
const migrationsDir = join(__dirname, '../../../src/migrations')

const filesystemMigrationNames = () =>
  readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()

describe('migrations index against the migrations directory', () => {
  it('registers every migration file on disk', () => {
    const onDisk = filesystemMigrationNames()
    const registered = migrations.map((m) => m.name)

    expect(registered.sort()).toEqual(onDisk)
  })

  it('registers migrations in filename-timestamp order', () => {
    const registered = migrations.map((m) => m.name)
    const sorted = [...registered].sort()

    expect(registered).toEqual(sorted)
  })
})
