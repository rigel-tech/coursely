// This is the only place the staged components are executed. Everything else about them is
// static: typecheck reads their types, theme-guard reads their classes, and the staging
// rules read their imports — none of that runs a line. A destructure of an optional prop, a
// map over something undefined, a Radix primitive used outside its Root: all render-time.
//
// Rendering the gallery exercises all of them at once, which is why the page earns a test
// even though it ships no product behaviour.

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `RegisterForm` (public/forms/) calls `useRouter()` — outside a real Next.js app router,
// as this render is, that throws "invariant expected app router to be mounted".
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { ComponentGallery } from '@/app/(frontend)/components/page.client'

afterEach(cleanup)

describe('/components', () => {
  it('renders every section without throwing', () => {
    render(<ComponentGallery />)

    // A crash inside any entry takes the whole tree down, so reaching the last section is
    // the assertion. Checking a few landmarks keeps the failure message useful.
    //
    // More than one level-1 heading is expected here, not a bug: `StudentAccount` is a full
    // page in its own right and owns its own `<h1>` (the student's name), which now
    // renders nested inside the gallery's own `<h1>Thư viện component</h1>`.
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2)
  })

  it('shows both staged and ready components, and says which is which', () => {
    render(<ComponentGallery />)

    // Was 9. `modal` was promoted out of design/ into public/ui/ when course registration
    // took it for its confirm step, so one more entry left the staged count for good. The
    // number is a sentinel against an empty gallery, not an inventory —
    // `tests/unit/repo/showcase.spec.ts` is what enforces completeness exactly.
    expect(screen.getAllByText(/@\/components\/design\//).length).toBeGreaterThan(7)
    expect(screen.getAllByText(/@\/components\/public\/forms\//).length).toBeGreaterThan(1)
    expect(screen.getAllByText(/@\/components\/public\/ui\//).length).toBeGreaterThan(5)
  })
})
