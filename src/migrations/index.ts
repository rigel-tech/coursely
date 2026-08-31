import * as migration_20260830_161642_initial from './20260830_161642_initial'

export const migrations = [
  {
    up: migration_20260830_161642_initial.up,
    down: migration_20260830_161642_initial.down,
    name: '20260830_161642_initial',
  },
]
