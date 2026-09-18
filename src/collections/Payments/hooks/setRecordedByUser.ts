import type { CollectionBeforeChangeHook } from 'payload'
import type { Payment } from '@/payload-types'

/**
 * `userId` ("Recorded By") is not staff-picked — it is stamped with the
 * authenticated staff account creating the record, overriding any value
 * supplied in the request. Only fires when there is an acting user; internal
 * Local API calls with no `user` (seeds, scripts) leave whatever was passed.
 */
export const setRecordedByUser: CollectionBeforeChangeHook<Payment> = ({
  data,
  operation,
  req,
}) => {
  if (operation === 'create' && req.user?.collection === 'users') {
    data.userId = req.user.id
  }

  return data
}
