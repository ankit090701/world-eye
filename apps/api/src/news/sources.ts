import { fetchGoogleNews, type RssItem } from './rss.js'
import { geoparse } from './gazetteer.js'
import type { NewsArticle, NewsCategory, NewsMapPoint, TrendingTopic } from './types.js'

const CATEGORY_QUERY: Record<NewsCategory, string | null> = {
  breaking: null, // Google News top stories
  disasters: 'natural disaster OR earthquake OR flood OR wildfire OR hurricane OR cyclone OR tornado',
  wars: 'war OR conflict OR military OR troops OR airstrike OR ceasefire',
  economic: 'economy OR inflation OR stock market OR trade OR recession OR interest rates',
  political: 'election OR government OR parliament OR president OR sanctions OR diplomacy',
}

function hashId(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function toArticle(item: RssItem, category: NewsCategory): NewsArticle {
  const geo = geoparse(item.title)
  return {
    id: hashId(item.link),
    title: item.title,
    source: item.source,
    url: item.link,
    publishedAt: item.publishedAt,
    category,
    place: geo?.place ?? null,
    lat: geo?.lat ?? null,
    lon: geo?.lon ?? null,
  }
}

export async function newsFeed(category: NewsCategory): Promise<NewsArticle[]> {
  const items = await fetchGoogleNews(CATEGORY_QUERY[category])
  return items.slice(0, 40).map((it) => toArticle(it, category))
}

// Aggregate geolocated news across a few categories into map hotspots.
const MAP_CATEGORIES: NewsCategory[] = ['disasters', 'wars', 'political']

export async function newsMap(): Promise<NewsMapPoint[]> {
  const results = await Promise.all(
    MAP_CATEGORIES.map(async (cat) => {
      try {
        return (await newsFeed(cat)).map((a) => ({ ...a, category: cat }))
      } catch {
        return []
      }
    }),
  )
  const byPlace = new Map<string, NewsMapPoint>()
  for (const article of results.flat()) {
    if (article.lat == null || article.lon == null || !article.place) continue
    const existing = byPlace.get(article.place)
    if (existing) {
      existing.count++
    } else {
      byPlace.set(article.place, {
        place: article.place,
        lat: article.lat,
        lon: article.lon,
        count: 1,
        category: article.category,
        title: article.title,
        url: article.url,
      })
    }
  }
  return Array.from(byPlace.values()).sort((a, b) => b.count - a.count)
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from',
  'as', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'will', 'would', 'can',
  'could', 'new', 'says', 'said', 'after', 'over', 'amid', 'into', 'this', 'that', 'his', 'her',
  'its', 'their', 'they', 'not', 'more', 'than', 'who', 'what', 'when', 'how', 'why', 'you', 'your',
  'news', 'live', 'update', 'updates', 'latest', 'video', 'report', 'day', 'week', 'year', 'first',
  'top', 'may', 'get', 'set', 'out', 'off', 'up', 'down', 'about',
  // month names / weekdays are date noise, not topics
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october',
  'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
])

// Trending = most frequent capitalised terms across recent breaking headlines.
export async function trending(): Promise<TrendingTopic[]> {
  const items = await fetchGoogleNews(CATEGORY_QUERY.breaking)
  const counts = new Map<string, { term: string; count: number }>()
  for (const it of items.slice(0, 80)) {
    // capitalised words / proper nouns (2+ chars); allow one trailing capitalised
    // word ("United States", "Taylor Swift") but not long headline fragments
    const matches = it.title.match(/\b([A-Z][a-zA-Z]{1,}(?:\s[A-Z][a-zA-Z]+){0,1})\b/g) ?? []
    const seen = new Set<string>()
    for (const raw of matches) {
      const term = raw.trim()
      const key = term.toLowerCase()
      if (term.length < 3 || STOPWORDS.has(key)) continue
      if (seen.has(key)) continue // count each headline once per term
      seen.add(key)
      const e = counts.get(key)
      if (e) e.count++
      else counts.set(key, { term, count: 1 })
    }
  }
  const ranked = Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || b.term.length - a.term.length,
  )
  // Prefer terms mentioned 2+ times, but a single breaking feed is sparse — pad
  // with the strongest single-mention proper nouns so the list is never empty.
  const strong = ranked.filter((t) => t.count >= 2)
  const topics = strong.length >= 8 ? strong : ranked.filter((t) => t.term.length >= 4)
  return topics.slice(0, 14)
}
