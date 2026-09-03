import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { AuditLogs } from '@/collections/AuditLogs'

const field = (name: string) => AuditLogs.fields.find((f) => 'name' in f && f.name === name)
const required = (name: string) =>
  (field(name) as Extract<Field, { required?: boolean }> | undefined)?.required

describe('AuditLogs collection config', () => {
  it('is registered under the "audit-logs" slug', () => {
    expect(AuditLogs.slug).toBe('audit-logs')
  })

  it('carries action, user, ip and userAgent', () => {
    for (const name of ['action', 'user', 'ip', 'userAgent']) {
      expect(field(name)).toBeDefined()
    }
  })

  it('requires action, ip and userAgent (user is optional)', () => {
    expect(required('action')).toBe(true)
    expect(required('ip')).toBe(true)
    expect(required('userAgent')).toBe(true)
    expect(required('user')).not.toBe(true)
  })

  it('is append-only: no create, update or delete, read is gated', () => {
    const access = AuditLogs.access ?? {}
    const noReq = { req: {} } as Parameters<NonNullable<typeof access.create>>[0]
    expect(access.create?.(noReq)).toBe(false)
    expect(access.update?.(noReq)).toBe(false)
    expect(access.delete?.(noReq)).toBe(false)
    expect(access.read?.(noReq)).toBe(false)
  })
})
