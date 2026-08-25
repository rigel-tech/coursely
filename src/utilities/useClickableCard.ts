'use client'
import type { RefObject } from 'react'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

type UseClickableCardType<T extends HTMLElement> = {
  cardRef: RefObject<T | null>
  linkRef: RefObject<HTMLAnchorElement | null>
}

interface Props {
  external?: boolean
  newTab?: boolean
  scroll?: boolean
}

function useClickableCard<T extends HTMLElement>({
  external = false,
  newTab = false,
  scroll = true,
}: Props): UseClickableCardType<T> {
  const router = useRouter()
  const cardRef = useRef<T>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const timeDown = useRef<number>(0)
  const hasActiveParent = useRef<boolean>(false)
  const pressedButton = useRef<number>(0)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.target) {
      const target = e.target as Element

      const timeNow = +new Date()
      const parent = target?.closest('a')

      pressedButton.current = e.button

      if (!parent) {
        hasActiveParent.current = false
        timeDown.current = timeNow
      } else {
        hasActiveParent.current = true
      }
    }
  }, [])

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const href = linkRef.current?.href

      if (!href) return

      const difference = +new Date() - timeDown.current
      const isPlainClick = !hasActiveParent.current && pressedButton.current === 0 && !e.ctrlKey

      if (difference <= 250 && isPlainClick) {
        if (external) {
          window.open(href, newTab ? '_blank' : '_self')
        } else {
          router.push(href, { scroll })
        }
      }
    },
    [external, newTab, router, scroll],
  )

  useEffect(() => {
    const cardNode = cardRef.current

    if (!cardNode) return

    const abortController = new AbortController()

    cardNode.addEventListener('mousedown', handleMouseDown, { signal: abortController.signal })
    cardNode.addEventListener('mouseup', handleMouseUp, { signal: abortController.signal })

    return () => {
      abortController.abort()
    }
  }, [handleMouseDown, handleMouseUp])

  return { cardRef, linkRef }
}

export default useClickableCard
