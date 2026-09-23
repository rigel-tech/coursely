import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Course, CourseObjective, CoursePhase } from '../../../payload-types'

type CourseChild = CourseObjective | CoursePhase

// The folder path, never the public `/khoa-hoc/:slug`: that one is a rewrite, and
// `revalidatePath` takes the route's own path — the public one is accepted without error and
// purges nothing. See INVARIANTS.
const coursePath = (slug: string) => `/courses/${slug}`

const revalidateCourseById = async (id: number, req: PayloadRequest) => {
  const { slug } = await req.payload.findByID({
    collection: 'courses',
    id,
    depth: 0,
    select: { slug: true },
    req,
  })
  revalidatePath(coursePath(slug))
}

const courseId = (course: CourseChild['course']) =>
  typeof course === 'object' ? course.id : course

/** Revalidates a course's detail page when it is published, unpublished or re-slugged. */
export const revalidateCourse: CollectionAfterChangeHook<Course> = ({ doc, previousDoc, req }) => {
  if (req.context.disableRevalidate) return doc

  if (doc._status === 'published') revalidatePath(coursePath(doc.slug))

  if (
    previousDoc._status === 'published' &&
    (doc._status !== 'published' || previousDoc.slug !== doc.slug)
  ) {
    revalidatePath(coursePath(previousDoc.slug))
  }
  return doc
}

/** Revalidates a deleted course's detail page. */
export const revalidateCourseDelete: CollectionAfterDeleteHook<Course> = ({ doc, req }) => {
  if (req.context.disableRevalidate) return doc

  revalidatePath(coursePath(doc.slug))
  return doc
}

/** Revalidates the detail page of the course an objective or phase belongs to. */
export const revalidateParentCourse: CollectionAfterChangeHook<CourseChild> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context.disableRevalidate) return doc

  // Both ends of a move: the course it left shows it too, until revalidated.
  const ids = new Set([doc.course, previousDoc.course].filter(Boolean).map(courseId))
  for (const id of ids) await revalidateCourseById(id, req)
  return doc
}

/** Revalidates the parent course's detail page when an objective or phase is deleted. */
export const revalidateParentCourseDelete: CollectionAfterDeleteHook<CourseChild> = async ({
  doc,
  req,
}) => {
  if (req.context.disableRevalidate) return doc

  await revalidateCourseById(courseId(doc.course), req)
  return doc
}
