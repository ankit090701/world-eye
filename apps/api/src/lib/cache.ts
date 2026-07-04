// Tiny in-memory TTL cache — keeps us within the free upstream rate limits.
interface Entry<T> {
  value: T
  expires: number
}

export class TTLCache<T> {
  private store = new Map<string, Entry<T>>()
  constructor(private ttlMs: number, private max = 2000) {}

  get(key: string): T | undefined {
    const e = this.store.get(key)
    if (!e) return undefined
    if (Date.now() > e.expires) {
      this.store.delete(key)
      return undefined
    }
    return e.value
  }

  set(key: string, value: T) {
    if (this.store.size >= this.max) {
      // drop oldest inserted key
      const first = this.store.keys().next().value
      if (first !== undefined) this.store.delete(first)
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs })
  }
}

/** fetch with an abort timeout so a slow upstream never hangs a request. */
export async function fetchJSON(
  url: string,
  timeoutMs = 6000,
  extraHeaders?: Record<string, string>,
): Promise<any> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'WorldEye/1.0',
        ...extraHeaders,
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}
