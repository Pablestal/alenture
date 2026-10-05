/**
 * Spaces outgoing requests by at least `minIntervalMs`, whatever the caller
 * does. It lives in `data/` on purpose: the throttle a free service asks for is
 * the repository's promise to keep, not something the UI is trusted to honour.
 * Debouncing upstream already removes most of the traffic — this is what makes
 * the limit true when it doesn't.
 *
 * It delays rather than drops: a request that arrives too soon is the one the
 * user is waiting on, and refusing it would show a failure where there is none.
 */
export function createMinIntervalGate(minIntervalMs: number): (signal?: AbortSignal) => Promise<void> {
  let nextAllowedAt = 0

  return async function waitForTurn(signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()

    const now = Date.now()
    const startAt = Math.max(now, nextAllowedAt)
    // The slot is claimed before the wait, so simultaneous callers queue in
    // arrival order instead of all waking on the same instant. A caller that
    // aborts mid-wait leaves its slot unused; that only ever makes us slower
    // than the limit, which is the safe direction to be wrong in.
    nextAllowedAt = startAt + minIntervalMs

    const delay = startAt - now
    if (delay > 0) {
      await sleep(delay, signal)
    }
    // Aborts that landed while we waited: the fetch must not go out at all.
    signal?.throwIfAborted()
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
