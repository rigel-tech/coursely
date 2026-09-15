/**
 * Lives outside the `'use server'` module because that file may only export async
 * functions. `redirectTo` only ever appears on a refusal — a successful enrollment has
 * nowhere to send the student — so it is typed only on the `'error'` branch.
 */
import { z } from 'zod'

export type CreateEnrollmentState =
  { status: 'success'; message: string } | { status: 'error'; message: string; redirectTo?: string }

/**
 * The Server Action's parameters are data sent by the client, not a value this module
 * constructed — `fullName`/`phone` are optional (a signed-out visitor's form has no
 * profile to send, and must still reach the sign-in redirect rather than a "profile
 * incomplete" refusal, specs/007-student-enrollment research.md Decision 5), but
 * `courseId` still needs its own runtime check the same way: nothing stops a caller from
 * sending a `courseId` that is not a number at all.
 */
export const createEnrollmentSchema = z.object({
  courseId: z.number().int().positive(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
})

export type CreateEnrollmentInput = z.input<typeof createEnrollmentSchema>
