// This is the only place the staged components are executed. Everything else about them is
// static: typecheck reads their types, theme-guard reads their classes, and the staging
// rules read their imports — none of that runs a line. A destructure of an optional prop, a
// map over something undefined, a Radix primitive used outside its Root: all render-time.
//
// Rendering the gallery exercises all of them at once, which is why the page earns a test
// even though it ships no product behaviour.

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ComponentGallery } from '@/app/(frontend)/components/page.client'

afterEach(cleanup)

describe('/components', () => {
  it('renders every section without throwing', () => {
    render(<ComponentGallery />)

    // A crash inside any entry takes the whole tree down, so reaching the last section is
    // the assertion. Checking a few landmarks keeps the failure message useful.
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2)
  })

  it('shows both staged and ready components, and says which is which', () => {
    render(<ComponentGallery />)

    // Was 10. `field`, `validation` and `register-form` were promoted out of design/ into
    // public/forms/ when the registration screen took them, so two entries left the staged
    // count for good. The number is a sentinel against an empty gallery, not an inventory —
    // `tests/unit/repo/showcase.spec.ts` is what enforces completeness exactly.
    expect(screen.getAllByText(/@\/components\/design\//).length).toBeGreaterThan(8)
    expect(screen.getAllByText(/@\/components\/public\/forms\//).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/@\/components\/public\/ui\//).length).toBeGreaterThan(5)
  })
})
