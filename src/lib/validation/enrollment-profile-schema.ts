/**
 * The strict reading of `makeProfileSchema` this registration screen needs — full name and
 * phone are required here, unlike `/tai-khoan`'s `profileSchema`. See
 * `profile-schema.ts`'s module banner for why this is a parameter, not a forked schema.
 */
import { makeProfileSchema } from './profile-schema'
import { z } from 'zod'

export const enrollmentProfileSchema = makeProfileSchema({ required: true })
export type EnrollmentProfileValues = z.infer<typeof enrollmentProfileSchema>
