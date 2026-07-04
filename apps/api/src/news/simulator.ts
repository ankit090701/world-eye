import type { NewsArticle, NewsCategory, NewsMapPoint, TrendingTopic } from './types.js'

// Deterministic sample used only if Google News RSS is unreachable, so the module
// is always demonstrable. Clearly flagged source: 'sim' in the API responses.
const SAMPLES: Record<NewsCategory, { title: string; place: string; lat: number; lon: number }[]> = {
  breaking: [
    { title: 'Global summit opens in Geneva amid heightened security', place: 'Geneva', lat: 46.2, lon: 6.14 },
    { title: 'Markets steady as investors await policy decision in Washington', place: 'Washington', lat: 38.9, lon: -77.04 },
  ],
  disasters: [
    { title: 'Powerful earthquake strikes region near Tokyo', place: 'Tokyo', lat: 35.68, lon: 139.69 },
    { title: 'Flooding forces evacuations across parts of Indonesia', place: 'Indonesia', lat: -0.79, lon: 113.92 },
    { title: 'Wildfires spread near Los Angeles amid heatwave', place: 'Los Angeles', lat: 34.05, lon: -118.24 },
  ],
  wars: [
    { title: 'Ceasefire talks resume amid ongoing conflict in the region', place: 'Ukraine', lat: 48.4, lon: 31.2 },
    { title: 'Military tensions rise along contested border', place: 'Syria', lat: 34.8, lon: 38.99 },
  ],
  economic: [
    { title: 'Central bank signals caution as inflation eases', place: 'London', lat: 51.51, lon: -0.13 },
    { title: 'Trade talks advance between major economies', place: 'Beijing', lat: 39.9, lon: 116.4 },
  ],
  political: [
    { title: 'Election campaign enters final stretch', place: 'Brazil', lat: -14.24, lon: -51.93 },
    { title: 'Parliament debates new sanctions package', place: 'Brussels', lat: 50.85, lon: 4.35 },
  ],
}

export function simArticles(category: NewsCategory, now: number): NewsArticle[] {
  return SAMPLES[category].map((s, i) => ({
    id: `sim-${category}-${i}`,
    title: s.title,
    source: 'WorldEye Sample',
    url: 'https://news.google.com/',
    publishedAt: now - i * 3600_000,
    category,
    place: s.place,
    lat: s.lat,
    lon: s.lon,
  }))
}

export function simMapPoints(): NewsMapPoint[] {
  const points: NewsMapPoint[] = []
  ;(['disasters', 'wars', 'political'] as NewsCategory[]).forEach((cat) => {
    for (const s of SAMPLES[cat]) {
      points.push({
        place: s.place,
        lat: s.lat,
        lon: s.lon,
        count: 1,
        category: cat,
        title: s.title,
        url: 'https://news.google.com/',
      })
    }
  })
  return points
}

export function simTrending(): TrendingTopic[] {
  return [
    { term: 'Geneva', count: 4 },
    { term: 'Election', count: 3 },
    { term: 'Inflation', count: 3 },
    { term: 'Ceasefire', count: 2 },
    { term: 'Wildfires', count: 2 },
  ]
}
