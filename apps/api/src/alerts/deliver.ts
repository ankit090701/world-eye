// Alert notification delivery (Module 14). The browser can't POST to Slack/Discord
// webhooks (CORS), so the API relays. User-supplied webhook URLs are an SSRF risk,
// so we require https and block private / loopback / link-local / metadata hosts.

export type ChannelKind = 'slack' | 'discord' | 'webhook'

function ipv4IsPrivate(v4: string): boolean {
  const m = v4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '') // strip IPv6 brackets
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  // IPv6 unspecified / loopback / unique-local / link-local
  if (h === '::' || h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  // IPv4 literal, or IPv4-mapped IPv6 in dotted form (::ffff:127.0.0.1)
  const dotted = h.match(/^(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (dotted) return ipv4IsPrivate(dotted[1])
  // IPv4-mapped IPv6 in hex form (::ffff:7f00:1 → 127.0.0.1)
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const hi = parseInt(hex[1], 16)
    const lo = parseInt(hex[2], 16)
    return ipv4IsPrivate(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }
  return false
}

export function validateWebhook(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: 'invalid URL' }
  }
  if (url.protocol !== 'https:') return { ok: false, error: 'webhook must be https' }
  if (isPrivateHost(url.hostname)) return { ok: false, error: 'private / internal hosts are not allowed' }
  return { ok: true, url }
}

// Shape the payload for the target service.
function body(kind: ChannelKind, text: string): string {
  if (kind === 'slack') return JSON.stringify({ text })
  if (kind === 'discord') return JSON.stringify({ content: text.slice(0, 1900) })
  return JSON.stringify({ source: 'WorldEye', text, at: Date.now() })
}

export async function deliverWebhook(
  kind: ChannelKind,
  rawUrl: string,
  text: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const v = validateWebhook(rawUrl)
  if (!v.ok) return { ok: false, error: v.error }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(v.url.toString(), {
      method: 'POST',
      signal: ctrl.signal,
      redirect: 'error', // don't follow redirects (SSRF bypass vector)
      headers: { 'Content-Type': 'application/json' },
      body: body(kind, text),
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'delivery failed' }
  } finally {
    clearTimeout(t)
  }
}
