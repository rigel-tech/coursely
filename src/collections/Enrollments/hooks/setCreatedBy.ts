import type { CollectionBeforeChangeHook } from 'payload'

export const setCreatedBy: CollectionBeforeChangeHook = ({ data, operation, req }) => {
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
