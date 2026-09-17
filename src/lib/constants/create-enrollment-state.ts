export type CreateEnrollmentState =
  | { status: 'success'; message: string; enrollmentId: number }
  | { status: 'error'; message: string }
