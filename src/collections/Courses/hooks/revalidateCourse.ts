import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Course, CourseObjective, CoursePhase } from '../../../payload-types'

type CourseChild = CourseObjective | CoursePhase

// The folder path, never the public `/khoa-hoc/:slug`: that one is a rewrite, and
// `revalidatePath` takes the route's own path — the public one is accepted without error and
// purges nothing. See INVARIANTS.
const coursePath = (slug: string) => `/courses/${slug}`

// The home page lists published courses, so any course change that reaches the public site
// revalidates it too. Objectives and phases never appear there.
const HOME = '/'

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

/** Revalidates a course's page, and the home page, on publish, unpublish or re-slug. */
export const revalidateCourse: CollectionAfterChangeHook<Course> = ({ doc, previousDoc, req }) => {
  if (req.context.disableRevalidate) return doc

  const paths = new Set<string>()
  if (doc._status === 'published') paths.add(coursePath(doc.slug))

  if (
    previousDoc._status === 'published' &&
    (doc._status !== 'published' || previousDoc.slug !== doc.slug)
  ) {
    paths.add(coursePath(previousDoc.slug))
  }

  if (paths.size > 0) paths.add(HOME)
  for (const path of paths) revalidatePath(path)
  return doc
}

/** Revalidates a deleted course's detail page and the home page. */
export const revalidateCourseDelete: CollectionAfterDeleteHook<Course> = ({ doc, req }) => {
  if (req.context.disableRevalidate) return doc

  revalidatePath(coursePath(doc.slug))
  revalidatePath(HOME)
  return doc
}

/** Revalidates the detail page of the course an objective or phase belongs to. */
export const revalidateParentCourse: CollectionAfterChangeHook<CourseChild> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context.disableRevalidate) {
    return doc
  }

  const courseIds = new Set([doc.course, previousDoc?.course].filter(Boolean).map(courseId))

  await Promise.all([...courseIds].map((courseId) => revalidateCourseById(courseId, req)))

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
