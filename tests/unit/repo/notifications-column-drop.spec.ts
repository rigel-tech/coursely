// `payload migrate:create` diffs two schemas. It cannot see a rename, so a field renamed
// in the collection config comes out the other side as DROP COLUMN + ADD COLUMN — SQL that
// applies without an error and leaves every existing row with an empty value where its
// owner used to be. There is no failure to notice: the migration succeeds, the app boots,
// and the notifications are simply orphaned.
//
// `notifications.student` is required and is written inside the registration transaction,
// so losing it is losing the link between an account and its welcome message. Renaming
// that column belongs in hand-written SQL (`ALTER TABLE ... RENAME COLUMN`).
//
// If a column here genuinely has to go one day, delete this spec in the same commit and
// say why in the migration.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS = 'src/migrations'

const dropsANotificationsColumn = (sql: string): boolean =>
  /ALTER TABLE\s+"?notifications"?\s+DROP COLUMN/i.test(sql)

describe('no migration drops a column from notifications', () => {
  const files = readdirSync(MIGRATIONS).filter((name) => /^\d.*\.ts$/.test(name))

  it('finds none', () => {
    expect(
      files.filter((name) =>
        dropsANotificationsColumn(readFileSync(join(MIGRATIONS, name), 'utf8')),
      ),
    ).toEqual([])
  })

  it('finds migrations at all (an empty scan would pass forever)', () => {
    expect(files.length).toBeGreaterThan(0)
  })
})
