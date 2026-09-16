export type CreateEnrollmentState =
  { status: 'success'; message: string } | { status: 'error'; message: string; redirectTo?: string }
