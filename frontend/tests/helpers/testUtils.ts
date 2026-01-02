import { createPinia, setActivePinia } from "pinia";

/**
 * Setup Pinia for tests
 */
export function setupPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

/**
 * Wait for next tick (async operations)
 */
export async function waitForNextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Flush all pending promises
 */
export async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}
