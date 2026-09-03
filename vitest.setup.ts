// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// jsdom ships no ResizeObserver; Radix primitives (e.g. Checkbox via react-use-size)
// call it from a layout effect. A no-op stub is enough for component tests.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
