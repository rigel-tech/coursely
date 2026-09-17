import type { Payload } from 'payload'

/**
 * A mocked `Payload` never has the whole shape — only the methods a given spec's stub
 * needs, each a plain `vi.fn()` whose inferred type cannot structurally match Payload's
 * generic method signatures (`create<TSlug, TSelect>`, etc.) no matter how the stub is
 * typed. `unknown` is the honest middle step; `object` on the input at least still rejects
 * a bare primitive. This is the one cast, so individual specs stop reaching for their own
 * `as never` at every `getPayload` mock.
 */
export const asPayload = (stub: object): Payload => stub as unknown as Payload
