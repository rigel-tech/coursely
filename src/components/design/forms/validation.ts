// One home for the rules every form in this folder shares.
//
// The alternative — each form spelling out `required: 'Vui lòng nhập email'` and its own
// email pattern — drifts the moment one of them is edited: four forms, four slightly
// different messages, and a rule tightened in one place still loose in the other three.
// Forms import a preset and declare only what genuinely deviates.
//
// None of these carries an explicit return type. `RegisterOptions` is a union whose members
// are mutually exclusive on `pattern` / `valueAsNumber` / `valueAsDate`, so annotating with
// the union widens the literal flags and every call site stops type-checking. Inference
// keeps each preset narrow enough for `register()` to accept it.

/** Minimum password length accepted anywhere in the product. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Deliberately permissive: one `@`, something either side, a dot in the domain.
 * Stricter patterns reject valid addresses, and only sending mail proves an address works.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A required field with nothing else to say about it. */
export const required = (label: string) => ({
  required: `${label} không được để trống`,
})

/** Required, and shaped like an email address. */
export const email = (label = 'Email') => ({
  ...required(label),
  pattern: { value: EMAIL_PATTERN, message: `${label} không hợp lệ` },
})

/** Required, and long enough to be a password. */
export const password = (label = 'Mật khẩu') => ({
  ...required(label),
  minLength: {
    value: MIN_PASSWORD_LENGTH,
    message: `${label} phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
  },
})

/**
 * Required, and equal to another field's current value — for "confirm password".
 *
 * Takes a getter rather than the value so it reads the live field on every validation pass;
 * a captured value would keep comparing against whatever the password was on first render.
 */
export const matches = (getOther: () => string, message: string) => ({
  validate: (value: string) => value === getOther() || message,
})

/** Required, and a number inside an inclusive range. */
export const numberInRange = (label: string, min: number, max: number) => ({
  ...required(label),
  valueAsNumber: true as const,
  min: { value: min, message: `${label} phải từ ${min} trở lên` },
  max: { value: max, message: `${label} không được vượt quá ${max}` },
})
