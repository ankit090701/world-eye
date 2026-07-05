import { API_BASE } from '../config/api'

export type WebhookKind = 'slack' | 'discord' | 'webhook'

/** Relay an alert to a user-configured webhook (Slack/Discord/generic) via the API. */
export async function deliverAlert(
  kind: WebhookKind,
  url: string,
  text: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/alerts/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, url, text }),
    })
    return (await res.json()) as { ok: boolean; status?: number; error?: string }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'delivery failed' }
  }
}
