'use client'
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

/**
 * `false` on the server and during the first client render, `true` from then on.
 *
 * Gate browser-only values (localStorage, `document`, media queries) behind this instead
 * of writing them into state from an effect: the markup React hydrates stays identical to
 * the markup the server sent, and no extra render is scheduled from inside an effect.
 */
const useIsHydrated = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

export default useIsHydrated
