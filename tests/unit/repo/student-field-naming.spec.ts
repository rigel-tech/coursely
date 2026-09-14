// Two collections, two meanings of the word "user": `users` is staff, `students` is the
// public-site principal. A field called `user` that points at `students` reads as the
// first while being the second, and a reviewer has to open the relationship to tell.
//
// It also breaks silently in the direction that matters: `where: { user: ... }` against a
// collection whose field was meant for staff still compiles and still returns rows — the
// wrong ones. `Notifications.student` was the last such field; this keeps the next one
// from being added by habit.

import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Field } from 'payload'

import { Categories } from '@/collections/Categories'
import { Classes } from '@/collections/Classes'
import { CourseObjectives } from '@/collections/CourseObjectives'
import { CoursePhases } from '@/collections/CoursePhases'
import { Courses } from '@/collections/Courses'
import { Media } from '@/collections/Media'
import { Notifications } from '@/collections/Notifications'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'
import { Students } from '@/collections/Students'
import { Users } from '@/collections/Users'

const collections: CollectionConfig[] = [
  Categories,
  Classes,
  CourseObjectives,
  CoursePhases,
  Courses,
  Media,
  Notifications,
  Pages,
  Posts,
  Students,
  Users,
]

type NamedField = Extract<Field, { name: string }>

const isRelationship = (field: Field): field is Extract<Field, { type: 'relationship' }> =>
  field.type === 'relationship'

/** Every `{ collection, field }` pair whose relationship points at `students`. */
const studentRelationships = collections.flatMap((collection) =>
  collection.fields
    .filter(isRelationship)
    .filter((field) => field.relationTo === 'students')
    .map((field) => ({ collection: collection.slug, field: (field as NamedField).name })),
)

describe('a relationship to students is named for a student', () => {
  it('finds no such field called user, owner or account', () => {
    expect(
      studentRelationships.filter(({ field }) => ['user', 'owner', 'account'].includes(field)),
    ).toEqual([])
  })

  it('finds relationships at all (an empty scan would pass forever)', () => {
    expect(studentRelationships.length).toBeGreaterThan(0)
  })
})
