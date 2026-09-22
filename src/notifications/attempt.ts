import type { Payload } from 'payload'

/**
 * Runs one best-effort send and logs its failure instead of throwing. A job that throws is
 * retried from the top, so a throw after anything went out would send it all again — a
 * notification job may only throw from the lookups it does before sending anything.
 */
export async function attempt(
  payload: Payload,
  label: string,
  send: () => Promise<unknown>,
): Promise<void> {
  try {
    await send()
  } catch (err) {
    payload.logger.error({ err }, label)
  }
}
