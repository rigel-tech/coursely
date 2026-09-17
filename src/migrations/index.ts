import * as migration_20260830_161642_initial from './20260830_161642_initial'
import * as migration_20260903_083223_add_courses_collection from './20260903_083223_add_courses_collection'
import * as migration_20260903_084929_add_course_objectives_and_phases from './20260903_084929_add_course_objectives_and_phases'
import * as migration_20260904_084119_add_course_categories_and_tags from './20260904_084119_add_course_categories_and_tags'
import * as migration_20260909_140000_split_students_from_users from './20260909_140000_split_students_from_users'
import * as migration_20260910_062709_add_site_settings_global from './20260910_062709_add_site_settings_global'
import * as migration_20260910_131500_rename_notifications_user_to_student from './20260910_131500_rename_notifications_user_to_student'
import * as migration_20260912_000000_drop_students_is_walk_in from './20260912_000000_drop_students_is_walk_in'
import * as migration_20260915_220048_add_payments_collection from './20260915_220048_add_payments_collection'

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
  {
    up: migration_20260904_084119_add_course_categories_and_tags.up,
    down: migration_20260904_084119_add_course_categories_and_tags.down,
    name: '20260904_084119_add_course_categories_and_tags',
  },
  {
    up: migration_20260909_140000_split_students_from_users.up,
    down: migration_20260909_140000_split_students_from_users.down,
    name: '20260909_140000_split_students_from_users',
  },
  {
    up: migration_20260910_062709_add_site_settings_global.up,
    down: migration_20260910_062709_add_site_settings_global.down,
    name: '20260910_062709_add_site_settings_global',
  },
  {
    up: migration_20260910_131500_rename_notifications_user_to_student.up,
    down: migration_20260910_131500_rename_notifications_user_to_student.down,
    name: '20260910_131500_rename_notifications_user_to_student',
  },
  {
    up: migration_20260912_000000_drop_students_is_walk_in.up,
    down: migration_20260912_000000_drop_students_is_walk_in.down,
    name: '20260912_000000_drop_students_is_walk_in',
  },
  // {
  //   up: migration_20260914_120000_add_enrollments_collection.up,
  //   down: migration_20260914_120000_add_enrollments_collection.down,
  //   name: '20260914_120000_add_enrollments_collection',
  // },
  // {
  //   up: migration_20260914_130000_add_enrollment_active_guard.up,
  //   down: migration_20260914_130000_add_enrollment_active_guard.down,
  //   name: '20260914_130000_add_enrollment_active_guard',
  // },
  // {
  //   up: migration_20260914_140000_make_notification_student_optional.up,
  //   down: migration_20260914_140000_make_notification_student_optional.down,
  //   name: '20260914_140000_make_notification_student_optional',
  // },
  // {
  //   up: migration_20260917_070000_add_notifications_user_field.up,
  //   down: migration_20260917_070000_add_notifications_user_field.down,
  //   name: '20260917_070000_add_notifications_user_field',
  // },
  {
    up: migration_20260915_220048_add_payments_collection.up,
    down: migration_20260915_220048_add_payments_collection.down,
    name: '20260915_220048_add_payments_collection',
  },
]
