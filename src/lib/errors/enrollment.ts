/**
 * Refusal the enrollment flow throws for a duplicate active enrollment — a class, not an
 * error code, matching the pattern in `src/lib/errors/auth.ts` (see that file's module
 * banner for why these live apart from the service that throws them).
 */
import { APIError } from 'payload'

/** A student already holds an active (non-CANCELLED) enrollment in this course. */
export class EnrollmentAlreadyExists extends APIError {
  constructor() {
    super('Bạn đã đăng ký khóa học này rồi.', 409)
  }
}
