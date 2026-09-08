import type { GlobalAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'
import { redis } from '@/lib/redis'

export const revalidateHeader: GlobalAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating header`)

    try {
      await redis.del('global_header')
    } catch (err) {
      payload.logger.error(`Failed to invalidate header in Redis: ${err}`)
    }

    revalidateTag('global_header', 'max')
  }

  return doc
}
