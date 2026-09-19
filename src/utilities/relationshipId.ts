/**
 * The id behind a Payload relationship value, whatever depth it came back at: a bare id when
 * the caller read at `depth: 0`, the populated document otherwise. Returns `null` for an
 * unset relationship, so callers can compare two sides without minding which shape each one
 * arrived in.
 *
 * Ids in this project are numbers (see INVARIANTS.md) — a string is never a valid id here, so
 * this deliberately does not accept one.
 */
export const relationshipId = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value
    return typeof id === 'number' ? id : null
  }

  return null
}
