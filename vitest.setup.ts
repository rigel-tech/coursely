// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// jsdom implements no ResizeObserver, and Radix's Select and Tabs both construct one while
// measuring their triggers. Without it the component throws during render and the failure
// reads as a broken component rather than a missing browser API.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
