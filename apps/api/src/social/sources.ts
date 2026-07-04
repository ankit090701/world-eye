import { fetchJSON } from '../lib/cache.js'
import { geoparse } from '../news/gazetteer.js'
import type { SocialMapPoint, SocialPost, SocialSource } from './types.js'

const UA = 'Mozilla/5.0 (compatible; WorldEye/1.0; +https://worldeye.local)'

async function fetchText(url: string, timeoutMs = 10000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

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

// ---------- Reddit (Atom RSS — .json is blocked without auth) ----------
export async function fetchReddit(sub = 'popular'): Promise<SocialPost[]> {
  const xml = await fetchText(`https://www.reddit.com/r/${encodeURIComponent(sub)}/.rss?limit=40`, 10000)
  if (!xml.includes('<entry')) throw new Error('reddit blocked')
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []
  const posts: SocialPost[] = []
  for (const e of entries) {
    const title = decode(first(e, /<title>([\s\S]*?)<\/title>/) ?? '')
    const url = first(e, /<link[^>]*href="([^"]+)"/) ?? ''
    if (!title || !url) continue
    const subreddit = first(e, /<category[^>]*label="([^"]+)"/) ?? first(e, /<category[^>]*term="([^"]+)"/)
    const updated = first(e, /<updated>([^<]+)<\/updated>/)
    posts.push({
      id: hashId(url),
      source: 'reddit',
      title,
      author: subreddit ? (subreddit.startsWith('r/') ? subreddit : `r/${subreddit}`) : null,
      url,
      score: null,
      meta: null,
      publishedAt: updated ? Date.parse(updated) || null : null,
      ...geo(title),
    })
  }
  return posts.slice(0, 40)
}

// ---------- Google Trends (RSS — keyless proxy for search/X trends) ----------
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
  const xml = await fetchText(`https://trends.google.com/trending/rss?geo=${geoParam}`, 10000)
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

// ---------- Hacker News (Algolia front page) ----------
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

// ---------- YouTube (Piped — keyless Invidious/Piped proxy) ----------
const PIPED_HOSTS = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de']
function fmtViews(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M views`
  if (v >= 1e3) return `${Math.round(v / 1e3)}K views`
  return `${v} views`
}
export async function fetchYouTube(region = 'US'): Promise<SocialPost[]> {
  let arr: any[] | null = null
  for (const host of PIPED_HOSTS) {
    try {
      const d = await fetchJSON(`${host}/trending?region=${region}`, 9000)
      if (Array.isArray(d) && d.length) {
        arr = d
        break
      }
    } catch {
      /* try next instance */
    }
  }
  if (!arr) throw new Error('piped unavailable')
  return arr.slice(0, 30).map((v) => {
    const title = String(v.title ?? '')
    const path = String(v.url ?? '')
    return {
      id: hashId(path || title),
      source: 'youtube' as const,
      title,
      author: v.uploaderName ?? null,
      url: path.startsWith('http') ? path : `https://www.youtube.com${path}`,
      score: typeof v.views === 'number' ? v.views : null,
      meta: typeof v.views === 'number' ? fmtViews(v.views) : null,
      publishedAt: typeof v.uploaded === 'number' ? v.uploaded : null,
      ...geo(title),
    }
  })
}

// ---------- Telegram (public channel web previews) ----------
const TG_CHANNELS = ['telegram', 'durov']
export async function fetchTelegram(): Promise<SocialPost[]> {
  const posts: SocialPost[] = []
  for (const ch of TG_CHANNELS) {
    try {
      const html = await fetchText(`https://t.me/s/${ch}`, 9000)
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

// ---------- dispatch + map ----------
export function fetchSource(source: SocialSource): Promise<SocialPost[]> {
  switch (source) {
    case 'reddit':
      return fetchReddit()
    case 'trends':
      return fetchTrends()
    case 'hn':
      return fetchHN()
    case 'youtube':
      return fetchYouTube()
    case 'telegram':
      return fetchTelegram()
  }
}

// All sources feed the buzz map — social content is less geographic than news, so
// casting a wide net (incl. YouTube/Telegram headlines) yields more hotspots.
const MAP_SOURCES: SocialSource[] = ['reddit', 'trends', 'hn', 'youtube', 'telegram']

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
