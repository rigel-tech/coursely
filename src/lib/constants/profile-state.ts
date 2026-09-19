/**
 * Outcome surfaced to `<PersonalInfoCard>`. One message, no per-field map — the client already
 * validated through `profileSchema`, so a server-side rejection means a caller bypassed
 * the form.
 *
 * Lives outside the `'use server'` module because that file may only export async
 * functions.
 */
export type ProfileState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export const initialProfileState: ProfileState = { status: 'idle' }
