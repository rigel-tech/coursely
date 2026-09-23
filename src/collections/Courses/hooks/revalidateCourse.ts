import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Course } from '@/payload-types'

export const revalidateCourse: CollectionAfterChangeHook<Course> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const paths = [`/khoa-hoc/${doc.slug}`, `/courses/${doc.slug}`, '/']

      payload.logger.info(`Revalidating course at paths: ${paths.join(', ')}`)

      for (const path of paths) {
        try {
          revalidatePath(path)
        } catch {
          // Ignored outside Next.js request context (e.g. CLI seed scripts)
        }
      }
    }

    // If the course was previously published and was unpublished, or if the slug changed,
    // we need to revalidate the previous paths.
    const wasPublished = previousDoc?._status === 'published'
    const isNowUnpublished = doc._status !== 'published'
    const slugChanged = Boolean(previousDoc?.slug && previousDoc.slug !== doc.slug)

    if (wasPublished && (isNowUnpublished || slugChanged) && previousDoc?.slug) {
      const oldPaths = [`/khoa-hoc/${previousDoc.slug}`, `/courses/${previousDoc.slug}`, '/']

      payload.logger.info(`Revalidating old course at paths: ${oldPaths.join(', ')}`)

      for (const oldPath of oldPaths) {
        try {
          revalidatePath(oldPath)
        } catch {
          // Ignored outside Next.js request context
        }
      }
    }
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Course> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate && doc?.slug) {
    const paths = [`/khoa-hoc/${doc.slug}`, `/courses/${doc.slug}`, '/']

    payload.logger.info(`Revalidating deleted course at paths: ${paths.join(', ')}`)

    for (const path of paths) {
      try {
        revalidatePath(path)
      } catch {
        // Ignored outside Next.js request context
      }
    }
  }

  return doc
}
