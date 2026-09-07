import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('email adapter', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('wires the nodemailer adapter from the SMTP_* env vars', () => {
    expect(payload.email.name).toBe('nodemailer')
    expect(payload.email.defaultFromAddress).toBe(process.env.SMTP_FROM_ADDRESS)
    expect(payload.email.defaultFromName).toBe(process.env.SMTP_FROM_NAME)
  })
})
