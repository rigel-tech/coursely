import type { CollectionBeforeChangeHook } from 'payload'
import type { Enrollment } from '@/payload-types'

export const setCreatedBy: CollectionBeforeChangeHook<Enrollment> = ({ data, operation, req }) => {
  if (operation === 'create') {
    if (req.user?.collection === 'users') {
      data.createdBy = req.user.id
      data.registrationSource = 'ADMIN_CREATED'
    } else {
      delete data.createdBy
    }
  }

  return data
}
