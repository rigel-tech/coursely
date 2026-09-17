import { useTransition } from 'react'
import { getGoogleAuthUrlAction } from '@/actions/student/google-auth'
import { GOOGLE_AUTH_ERROR_MESSAGES } from '@/lib/constants/google-auth-errors'

interface UseGoogleAuthOptions {
  onError?: (errorMessage: string) => void
}

export function useGoogleAuth(options?: UseGoogleAuthOptions) {
  const [isPending, startTransition] = useTransition()

  const loginWithGoogle = () => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl')

    startTransition(async () => {
      try {
        const url = await getGoogleAuthUrlAction(callbackUrl)

        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
          url,
          'GoogleAuthPopup',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
        )

        if (!popup) {
          window.location.href = url
          return
        }

        const cleanup = () => {
          clearInterval(checkPopupClosed)
          window.removeEventListener('message', messageHandler)
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          if (event.data?.source !== 'coursely_google_auth') return

          cleanup()

          if (event.data.type === 'SUCCESS') {
            window.location.replace(event.data.redirectTo || '/')
          } else if (event.data.type === 'OTP') {
            window.location.replace(event.data.redirectTo || '/xac-thuc-otp')
          } else if (event.data.type === 'ERROR') {
            const errorMsg =
              GOOGLE_AUTH_ERROR_MESSAGES[event.data.error] ||
              'Đăng nhập bằng Google không thành công. Vui lòng thử lại sau.'
            options?.onError?.(errorMsg)
          }
        }

        const checkPopupClosed = setInterval(() => {
          if (popup.closed) cleanup()
        }, 1000)

        window.addEventListener('message', messageHandler)
      } catch {
        options?.onError?.('Có lỗi hệ thống. Vui lòng thử lại sau.')
      }
    })
  }

  return { loginWithGoogle, isGooglePending: isPending }
}
