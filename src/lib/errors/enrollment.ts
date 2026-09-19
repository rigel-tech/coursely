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

/**
 * The enrollment id does not resolve, or resolves to a different student's enrollment.
 * Deliberately the same message/class for both — never confirms another student's
 * enrollment exists.
 */
export class EnrollmentNotFound extends APIError {
  constructor() {
    super('Không tìm thấy đơn đăng ký.', 404)
  }
}

/** `enrollmentStatus` is already `CANCELLED`. */
export class EnrollmentAlreadyCancelled extends APIError {
  constructor() {
    super('Đơn đăng ký này đã được hủy trước đó.', 409)
  }
}

/** `enrollmentStatus` is `ATTENDED` or `COMPLETED` — too far along to self-cancel. */
export class EnrollmentNotCancellable extends APIError {
  constructor() {
    super('Đơn đăng ký này không thể tự hủy ở trạng thái hiện tại.', 400)
  }
}

/** `paymentStatus` is `PAID` — a transaction already exists. */
export class EnrollmentHasPayment extends APIError {
  constructor() {
    super('Đơn đăng ký đã có giao dịch thanh toán, vui lòng liên hệ trung tâm để được hỗ trợ.', 400)
  }
}

/** The assigned class's `startDate` has already arrived. */
export class EnrollmentAlreadyStarted extends APIError {
  constructor() {
    super('Khóa học đã khai giảng, không thể tự hủy đăng ký.', 400)
  }
}
