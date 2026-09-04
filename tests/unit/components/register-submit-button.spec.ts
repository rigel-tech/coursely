import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SubmitButton } from '@/components/public/RegisterCta/SubmitButton'

afterEach(cleanup)

/** A form whose action never settles, so `useFormStatus().pending` stays true after submit. */
function PendingForm() {
  return React.createElement(
    'form',
    { action: () => new Promise<void>(() => {}) },
    React.createElement(SubmitButton),
  )
}

describe('SubmitButton', () => {
  it('swaps to a pending label and disables itself while the form is submitting', async () => {
    render(React.createElement(PendingForm))
    const button = screen.getByRole('button') as HTMLButtonElement

    expect(button.textContent).toBe('Tạo tài khoản')
    expect(button.disabled).toBe(false)

    fireEvent.click(button)

    await waitFor(() => expect(button.disabled).toBe(true))
    expect(button.textContent).toBe('Đang xử lý…')
  })
})
