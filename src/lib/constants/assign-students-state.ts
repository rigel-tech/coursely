export type AssignStudentsState =
  { status: 'success'; assigned: number } | { status: 'error'; message: string }
