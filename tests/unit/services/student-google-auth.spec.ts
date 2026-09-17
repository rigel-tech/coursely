// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { handleGoogleStudentAuth } from '@/services/student-google-auth'
import type { GoogleUserInfo } from '@/lib/auth/google-oauth'
import type { Student } from '@/payload-types'

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

const mockFind = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockLoggerWarn = vi.fn()
const mockBeginTransaction = vi.fn()
const mockCommitTransaction = vi.fn()
const mockRollbackTransaction = vi.fn()

const mockPayload = {
  find: mockFind,
  create: mockCreate,
  update: mockUpdate,
  logger: {
    warn: mockLoggerWarn,
    error: vi.fn(),
    info: vi.fn(),
  },
  db: {
    beginTransaction: mockBeginTransaction,
    commitTransaction: mockCommitTransaction,
    rollbackTransaction: mockRollbackTransaction,
  },
} as unknown as Payload

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => mockPayload),
}))

describe('handleGoogleStudentAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBeginTransaction.mockResolvedValue('tx-123')
    mockCommitTransaction.mockResolvedValue(undefined)
    mockRollbackTransaction.mockResolvedValue(undefined)
  })

  const verifiedGoogleUser: GoogleUserInfo = {
    sub: 'google-sub-123',
    email: 'Student@Example.Com ',
    email_verified: true,
    name: 'Nguyễn Văn A',
    picture: 'https://lh3.googleusercontent.com/a/photo.jpg',
  }

  it('normalizes email (trimmed and lowercased) when querying database', async () => {
    mockFind.mockResolvedValue({ docs: [] })
    mockCreate.mockImplementation(async ({ collection, data }) => {
      if (collection === 'students') {
        return { id: 1, ...data } as Student
      }
      return { id: 10, ...data }
    })

    await handleGoogleStudentAuth(verifiedGoogleUser)

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        where: { email: { equals: 'student@example.com' } },
      }),
    )
  })

  it('returns disabled outcome when student account has status DISABLED', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: 1,
          email: 'student@example.com',
          status: 'DISABLED',
        } as Student,
      ],
    })

    const result = await handleGoogleStudentAuth(verifiedGoogleUser)

    expect(result).toEqual({ kind: 'disabled' })
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      { email: 'student@example.com' },
      'Google login attempt on a DISABLED account',
    )
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates active student and welcome notification for new verified Google user', async () => {
    mockFind.mockResolvedValue({ docs: [] })
    const createdStudent = {
      id: 1,
      email: 'student@example.com',
      fullName: 'Nguyễn Văn A',
      status: 'ACTIVE',
    } as Student

    mockCreate.mockImplementation(async ({ collection }) => {
      if (collection === 'students') return createdStudent
      return { id: 100 }
    })

    const result = await handleGoogleStudentAuth(verifiedGoogleUser)

    expect(result).toEqual({ kind: 'authenticated', student: createdStudent })
    expect(mockBeginTransaction).toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        data: expect.objectContaining({
          email: 'student@example.com',
          fullName: 'Nguyễn Văn A',
          status: 'ACTIVE',
        }),
      }),
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'notifications',
        data: expect.objectContaining({
          student: 1,
          type: 'ACCOUNT_CREATED',
          title: 'Chào mừng bạn đến với Coursely',
        }),
      }),
    )
    expect(mockCommitTransaction).toHaveBeenCalledWith('tx-123')
  })

  it('updates existing ACTIVE student lastLoginAt timestamp', async () => {
    const existingStudent = {
      id: 2,
      email: 'student@example.com',
      status: 'ACTIVE',
    } as Student
    mockFind.mockResolvedValue({ docs: [existingStudent] })
    const updatedStudent = {
      ...existingStudent,
      lastLoginAt: '2026-09-16T12:00:00.000Z',
    } as Student
    mockUpdate.mockResolvedValue(updatedStudent)

    const result = await handleGoogleStudentAuth(verifiedGoogleUser)

    expect(result).toEqual({ kind: 'authenticated', student: updatedStudent })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 2,
        data: expect.objectContaining({
          lastLoginAt: expect.any(String),
        }),
      }),
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('auto-activates existing PENDING_VERIFICATION student when logging in with verified Google email', async () => {
    const existingPendingStudent = {
      id: 3,
      email: 'student@example.com',
      status: 'PENDING_VERIFICATION',
    } as Student
    mockFind.mockResolvedValue({ docs: [existingPendingStudent] })
    const activatedStudent = {
      ...existingPendingStudent,
      status: 'ACTIVE',
      verifiedAt: '2026-09-16T12:00:00.000Z',
      lastLoginAt: '2026-09-16T12:00:00.000Z',
    } as Student
    mockUpdate.mockResolvedValue(activatedStudent)

    const result = await handleGoogleStudentAuth(verifiedGoogleUser)

    expect(result).toEqual({ kind: 'authenticated', student: activatedStudent })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'students',
        id: 3,
        data: expect.objectContaining({
          status: 'ACTIVE',
          verifiedAt: expect.any(String),
          lastLoginAt: expect.any(String),
        }),
      }),
    )
  })

  it('rolls back transaction and rethrows when student creation fails', async () => {
    mockFind.mockResolvedValue({ docs: [] })
    mockCreate.mockRejectedValue(new Error('DB insert failure'))

    await expect(handleGoogleStudentAuth(verifiedGoogleUser)).rejects.toThrow('DB insert failure')

    expect(mockRollbackTransaction).toHaveBeenCalledWith('tx-123')
  })
})
