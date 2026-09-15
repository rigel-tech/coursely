/**
 * Refusals the enrollment flow throws — classes, not error codes, matching the pattern in
 * `src/lib/errors/auth.ts` (see that file's module banner for why these live apart from
 * the service that throws them). `createEnrollmentAction` maps every one of these to its
 * own message; anything else it re-throws.
 */
import { APIError } from 'payload'

/** A student already holds an active (non-CANCELLED) enrollment in this course. */
export class EnrollmentAlreadyExists extends APIError {
  constructor() {
    super('Bạn đã đăng ký khóa học này rồi.', 409)
  }
}

/** The course id does not resolve to a published course. */
export class CourseNotFound extends APIError {
  constructor() {
    super('Khóa học không tồn tại.', 404)
  }
}

/** `registrationStartAt` is in the future. */
export class RegistrationNotOpen extends APIError {
  constructor() {
    super('Khóa học chưa đến thời gian mở đăng ký.', 400)
  }
}

/** `registrationEndAt` is in the past. */
export class RegistrationClosed extends APIError {
  constructor() {
    super('Thời hạn đăng ký khóa học này đã kết thúc.', 400)
  }
}
