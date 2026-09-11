import { describe, expect, it } from 'vitest'
import { profileSchema } from '@/lib/validation/profile-schema'

describe('profileSchema', () => {
  it('accepts a valid full name and phone number', () => {
    expect(profileSchema.safeParse({ fullName: 'Nguyễn Văn A', phone: '0987654321' }).success).toBe(
      true,
    )
  })

  it('accepts an empty phone', () => {
    expect(profileSchema.safeParse({ fullName: 'Trần Thị B', phone: '' }).success).toBe(true)
  })

  it('rejects a full name exceeding 255 characters', () => {
    expect(
      profileSchema.safeParse({ fullName: 'A'.repeat(256), phone: '0912345678' }).success,
    ).toBe(false)
  })

  it('rejects a malformed Vietnamese phone number', () => {
    expect(profileSchema.safeParse({ fullName: 'Lê Văn C', phone: '123456' }).success).toBe(false)
  })

  // The schema validates only — trimming and mapping a blank phone to `null` for storage
  // is `updateProfileAction`'s job now, not a transform buried inside the schema. The same
  // schema drives `<ProfileForm>`'s `zodResolver`, which has no use for a `null`.
  it('does not trim or transform — that is the action, not the schema', () => {
    const res = profileSchema.safeParse({ fullName: '  Nguyễn Văn A  ', phone: '' })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.fullName).toBe('  Nguyễn Văn A  ')
      expect(res.data.phone).toBe('')
    }
  })
})
