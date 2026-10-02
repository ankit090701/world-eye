import { fetchJSON, fetchText } from '../lib/cache.js'
import { geoparse } from '../news/gazetteer.js'
import type { SocialMapPoint, SocialPost, SocialSource } from './types.js'

const UA = 'Mozilla/5.0 (compatible; WorldEye/1.0; +https://worldeye.local)'
const fetchPage = (url: string, timeoutMs: number) => fetchText(url, timeoutMs, { 'User-Agent': UA })

const ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&nbsp;': ' ' }
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENT[m.toLowerCase()] ?? m)
    .trim()
}
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
const first = (block: string, re: RegExp): string | null => {
  const m = block.match(re)
  return m ? m[1] : null
}

function geo(title: string) {
  const g = geoparse(title)
  return { place: g?.place ?? null, lat: g?.lat ?? null, lon: g?.lon ?? null }
}
function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// Bluesky trending topics from the public AppView (keyless; the api.bsky.app host is the
// fallback when public.api.bsky.app turns a cloud IP away).
export async function fetchBluesky(): Promise<SocialPost[]> {
  let d: any = null
  for (const host of ['https://public.api.bsky.app', 'https://api.bsky.app']) {
    try {
      d = await fetchJSON(`${host}/xrpc/app.bsky.unspecced.getTrends`, 9000)
      break
    } catch {
      /* try the next host */
    }
  }
  const trends: any[] = Array.isArray(d?.trends) ? d.trends : []
  if (trends.length === 0) throw new Error('bluesky unavailable')
  return trends.map((t) => {
    const title = String(t.displayName ?? t.topic ?? '')
    const posts = typeof t.postCount === 'number' ? t.postCount : null
    return {
      id: String(t.topic ?? hashId(title)),
      source: 'bluesky' as const,
      title,
      author: t.category ? String(t.category).replace(/^\w/, (c) => c.toUpperCase()) : 'Bluesky',
      url: `https://bsky.app${t.link ?? ''}`,
      score: posts,
      meta: posts != null ? `${posts.toLocaleString('en-US')} posts` : null,
      publishedAt: t.startedAt ? Date.parse(t.startedAt) || null : null,
      // the one-line summary often names the place the headline leaves out
      ...geo(`${title}. ${t.description ?? ''}`),
    }
  })
}

// Google Trends RSS — a keyless stand-in for search/X trends.
function parseTraffic(s: string | null): number | null {
  if (!s) return null
  const m = s.replace(/,/g, '').match(/([\d.]+)\s*([KM]?)/i)
  if (!m) return null
  let n = parseFloat(m[1])
  if (/k/i.test(m[2])) n *= 1e3
  if (/m/i.test(m[2])) n *= 1e6
  return Math.round(n)
}

export async function fetchTrends(geoParam = 'US'): Promise<SocialPost[]> {
  const xml = await fetchPage(`https://trends.google.com/trending/rss?geo=${geoParam}`, 10000)
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  const posts: SocialPost[] = []
  for (const it of items) {
    const term = decode(first(it, /<title>([\s\S]*?)<\/title>/) ?? '')
    if (!term) continue
    const traffic = first(it, /approx_traffic>([^<]+)</)
    const newsUrl = first(it, /news_item_url>([^<]+)</)
    const explore = first(it, /<link>([^<]+)<\/link>/)
    const pub = first(it, /<pubDate>([^<]+)<\/pubDate>/)
    posts.push({
      id: hashId('trend:' + term),
      source: 'trends',
      title: term,
      author: 'Google Trends',
      url: newsUrl || explore || `https://trends.google.com/trends/explore?q=${encodeURIComponent(term)}`,
      score: parseTraffic(traffic),
      meta: traffic ? `${traffic} searches` : null,
      publishedAt: pub ? Date.parse(pub) || null : null,
      ...geo(term),
    })
  }
  return posts.slice(0, 30)
}

export async function fetchHN(): Promise<SocialPost[]> {
  const d = await fetchJSON('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30', 9000)
  const hits: any[] = Array.isArray(d?.hits) ? d.hits : []
  return hits.map((h) => {
    const title = String(h.title ?? h.story_title ?? '')
    return {
      id: String(h.objectID),
      source: 'hn' as const,
      title,
      author: h.author ? `@${h.author}` : 'Hacker News',
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: typeof h.points === 'number' ? h.points : null,
      meta: typeof h.num_comments === 'number' ? `${h.num_comments} comments` : null,
      publishedAt: h.created_at_i ? h.created_at_i * 1000 : null,
      ...geo(title),
    }
  })
}

// Mastodon's trending posts (mastodon.social, the largest instance; keyless).
// Its HTML hides link fragments in "invisible" spans and wraps hashtags in links.
const tootText = (html: string) =>
  decode(
    html
      .replace(/<span class="invisible">[^<]*<\/span>/g, '')
      .replace(/<span class="ellipsis">([^<]*)<\/span>/g, '$1…')
      .replace(/<br\s*\/?>|<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' '),
  )
export async function fetchMastodon(): Promise<SocialPost[]> {
  const arr: any[] = await fetchJSON('https://mastodon.social/api/v1/trends/statuses?limit=30', 9000)
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('mastodon unavailable')
  const posts: SocialPost[] = []
  for (const s of arr) {
    const text = (tootText(String(s.content ?? '')) || String(s.card?.title ?? '')).slice(0, 180)
    if (text.length < 12 || !s.url) continue
    const boosts = Number(s.reblogs_count) || 0
    const favs = Number(s.favourites_count) || 0
    posts.push({
      id: String(s.id),
      source: 'mastodon',
      title: text,
      author: s.account?.acct ? `@${s.account.acct}` : null,
      url: String(s.url),
      score: boosts + favs,
      meta: `${boosts} boosts · ${favs} favourites`,
      publishedAt: s.created_at ? Date.parse(s.created_at) || null : null,
      ...geo(text),
    })
  }
  return posts
}

const TG_CHANNELS = ['telegram', 'durov']
export async function fetchTelegram(): Promise<SocialPost[]> {
  const posts: SocialPost[] = []
  for (const ch of TG_CHANNELS) {
    try {
      const html = await fetchPage(`https://t.me/s/${ch}`, 9000)
      const blocks = html.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g) ?? []
      for (const b of blocks.slice(-8)) {
        const text = stripTags(b).slice(0, 180)
        if (text.length < 12) continue
        posts.push({
          id: hashId(ch + text),
          source: 'telegram',
          title: text,
          author: `@${ch}`,
          url: `https://t.me/${ch}`,
          score: null,
          meta: null,
          publishedAt: null,
          ...geo(text),
        })
      }
    } catch {
      /* skip channel */
    }
  }
  if (posts.length === 0) throw new Error('telegram unavailable')
  return posts.slice(0, 24).reverse()
}

export function fetchSource(source: SocialSource): Promise<SocialPost[]> {
  switch (source) {
    case 'bluesky':
      return fetchBluesky()
    case 'trends':
      return fetchTrends()
    case 'hn':
      return fetchHN()
    case 'mastodon':
      return fetchMastodon()
    case 'telegram':
      return fetchTelegram()
  }
}

// All sources feed the buzz map — social content is less geographic than news, so
// casting a wide net (incl. Mastodon/Telegram posts) yields more hotspots.
const MAP_SOURCES: SocialSource[] = ['bluesky', 'trends', 'hn', 'mastodon', 'telegram']

export async function socialMap(): Promise<SocialMapPoint[]> {
  const results = await Promise.all(
    MAP_SOURCES.map(async (src) => {
      try {
        return await fetchSource(src)
      } catch {
        return []
      }
    }),
  )
  const byPlace = new Map<string, SocialMapPoint>()
  for (const p of results.flat()) {
    if (p.lat == null || p.lon == null || !p.place) continue
    const ex = byPlace.get(p.place)
    if (ex) ex.count++
    else
      byPlace.set(p.place, {
        place: p.place,
        lat: p.lat,
        lon: p.lon,
        count: 1,
        source: p.source,
        title: p.title,
        url: p.url,
      })
  }
  return Array.from(byPlace.values()).sort((a, b) => b.count - a.count)
}
