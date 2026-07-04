// Minimal Google News RSS fetch + parse (no XML dependency). Google News RSS is
// free, keyless and reliable; each query returns up to ~100 items.

export interface RssItem {
  title: string
  link: string
  source: string | null
  publishedAt: number | null
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
}
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim()
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  if (!m) return null
  let v = m[1]
  const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdata) v = cdata[1]
  return decodeEntities(v)
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = []
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []
  for (const b of blocks) {
    const rawTitle = tag(b, 'title')
    const link = tag(b, 'link')
    if (!rawTitle || !link) continue
    // Google News appends " - Source" to titles and also provides a <source> tag.
    const sourceTag = b.match(/<source[^>]*>([\s\S]*?)<\/source>/i)
    const source = sourceTag ? decodeEntities(sourceTag[1]) : null
    let title = rawTitle
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim()
    const pub = tag(b, 'pubDate')
    const publishedAt = pub ? Date.parse(pub) || null : null
    items.push({ title, link, source, publishedAt })
  }
  return items
}

export async function fetchGoogleNews(query: string | null, timeoutMs = 10000): Promise<RssItem[]> {
  const base = 'https://news.google.com/rss'
  const url = query
    ? `${base}/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    : `${base}?hl=en-US&gl=US&ceid=US:en`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'WorldEye/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parseRss(await res.text())
  } finally {
    clearTimeout(t)
  }
}
