/**
 * Lives outside the `'use server'` module because that file may only export async
 * functions. `redirectTo` only ever appears on a refusal — a successful enrollment has
 * nowhere to send the student — so it is typed only on the `'error'` branch.
 */
export type CreateEnrollmentState =
  { status: 'success'; message: string } | { status: 'error'; message: string; redirectTo?: string }
