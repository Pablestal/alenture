/**
 * The single door to persistent key/value storage.
 *
 * Nothing in the app touches `localStorage` or `sessionStorage` directly: under
 * Capacitor this is backed by Preferences (or SQLite) instead, and that swap
 * should be one file. The interface is async for the same reason — the native
 * backends are, and callers that already await keep working unchanged.
 *
 * Keys are namespaced as `alenture.<namespace>.<key>` so a future backend
 * sharing a store with something else cannot collide.
 */

const ROOT_NAMESPACE = 'alenture'

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * `localStorage` is unavailable in a few real situations (Safari private mode,
 * a WebView with data storage disabled). Failing to read a key must degrade to
 * "no value", never crash the app on boot.
 */
function webStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function createStorage(namespace: string): KeyValueStorage {
  const prefix = `${ROOT_NAMESPACE}.${namespace}.`

  return {
    getItem(key) {
      const store = webStorage()
      return Promise.resolve(store?.getItem(prefix + key) ?? null)
    },
    setItem(key, value) {
      webStorage()?.setItem(prefix + key, value)
      return Promise.resolve()
    },
    removeItem(key) {
      webStorage()?.removeItem(prefix + key)
      return Promise.resolve()
    },
  }
}
