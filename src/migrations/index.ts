import * as migration_20260830_161642_initial from './20260830_161642_initial'
import * as migration_20260903_083223_add_courses_collection from './20260903_083223_add_courses_collection'
import * as migration_20260903_084929_add_course_objectives_and_phases from './20260903_084929_add_course_objectives_and_phases'

export const migrations = [
  {
    up: migration_20260830_161642_initial.up,
    down: migration_20260830_161642_initial.down,
    name: '20260830_161642_initial',
  },
  {
    up: migration_20260903_083223_add_courses_collection.up,
    down: migration_20260903_083223_add_courses_collection.down,
    name: '20260903_083223_add_courses_collection',
  },
  {
    up: migration_20260903_084929_add_course_objectives_and_phases.up,
    down: migration_20260903_084929_add_course_objectives_and_phases.down,
    name: '20260903_084929_add_course_objectives_and_phases',
  },
]
