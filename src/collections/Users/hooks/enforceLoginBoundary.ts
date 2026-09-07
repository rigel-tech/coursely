import { APIError, type CollectionBeforeLoginHook } from 'payload'

/**
 * Keeps the two sign-in surfaces apart. The student form (`authenticateUser`)
 * calls `payload.login` with `context.source === 'student'`; the admin panel and
 * the bare REST endpoint pass no such context. Throwing here happens inside the
 * login transaction, so a rejected attempt leaves no `users_sessions` row.
 *
 * `LoginBoundaryError` is an `APIError` (so the admin route still shapes a 403)
 * with a distinct `name` — `authenticateUser` catches that name and maps it to
 * `AUTH_025` rather than surfacing the raw message.
 */
const ADMIN_ONLY = 'Tài khoản này không có quyền truy cập trang quản trị.'
export const STUDENT_FORM_REJECTS_ADMIN =
  'Tài khoản quản trị vui lòng đăng nhập tại trang quản trị.'

class LoginBoundaryError extends APIError {
  constructor(message: string) {
    super(message, 403)
    this.name = 'LoginBoundaryError'
  }
}

export const enforceLoginBoundary: CollectionBeforeLoginHook = ({ context, user }) => {
  const fromStudentForm = (context as { source?: unknown })?.source === 'student'
  const role = (user as { role?: string }).role

  if (fromStudentForm) {
    if (role !== 'STUDENT') throw new LoginBoundaryError(STUDENT_FORM_REJECTS_ADMIN)
  } else if (role !== 'ADMIN') {
    throw new LoginBoundaryError(ADMIN_ONLY)
  }

  return user
}
