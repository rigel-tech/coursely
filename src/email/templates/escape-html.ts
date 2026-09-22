/**
 * Escapes text a person typed — a course title, a student's name — before it lands in email
 * markup. Element content only: quotes pass through, so never interpolate into an attribute.
 */
export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
