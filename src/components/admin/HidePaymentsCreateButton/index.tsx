import React from 'react'

/**
 * Payments is visible in the sidebar to browse/edit, but a payment can only be created from
 * the enrollment it belongs to — `Payments.enrollmentId` is read-only and only pre-filled
 * there (the join field's own "Add new" drawer). This hides the standalone list view's
 * "Create New" button via a scoped selector rather than `Payments.access.create`, which
 * that same join-field button also depends on — turning access off would remove both.
 */
export const HidePaymentsCreateButton: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <>
    <style>{`.collection-list--payments .list-create-new-doc { display: none; }`}</style>
    {children}
  </>
)
