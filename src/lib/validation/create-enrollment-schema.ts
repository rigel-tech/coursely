import { z } from 'zod'

/**
 * The Server Action's parameters are data sent by the client, not a value this module
 * constructed — `fullName`/`phone` are optional (a signed-out visitor's form has no
 * profile to send, and must still reach the sign-in redirect rather than a "profile
 * incomplete" refusal, specs/007-student-enrollment research.md Decision 5), but
 * `courseId` still needs its own runtime check the same way: nothing stops a caller from
 * sending a `courseId` that is not a number at all.
 */
export const createEnrollmentSchema = z.object({
  courseId: z
    .number({ error: 'Khóa học không hợp lệ.' })
    .int('Khóa học không hợp lệ.')
    .positive('Khóa học không hợp lệ.'),
  fullName: z.string().optional(),
  phone: z.string().optional(),
})

export type CreateEnrollmentInput = z.input<typeof createEnrollmentSchema>
