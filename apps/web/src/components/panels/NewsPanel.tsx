import { useEffect } from 'react'
import {
  Newspaper,
  Zap,
  Flame,
  Swords,
  TrendingUp,
  Landmark,
  ExternalLink,
  Loader2,
  MapPin,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { toggleLayer } from '../../store/layersSlice'
import { feedError, feedOk, feedStart, setCategory, trendingOk } from '../../store/newsSlice'
import { fetchNewsFeed, fetchNewsTrending } from '../../api/newsApi'
import type { NewsArticle, NewsCategory } from '../../types'
import { cx } from '../../lib/cx'

const TABS: { id: NewsCategory; label: string; icon: typeof Zap }[] = [
  { id: 'breaking', label: 'Breaking', icon: Zap },
  { id: 'disasters', label: 'Disasters', icon: Flame },
  { id: 'wars', label: 'Conflict', icon: Swords },
  { id: 'economic', label: 'Economy', icon: TrendingUp },
  { id: 'political', label: 'Politics', icon: Landmark },
]

function timeAgo(ms: number | null): string {
  if (!ms) return ''
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function NewsPanel() {
  const dispatch = useAppDispatch()
  const category = useAppSelector((s) => s.news.category)
  const articles = useAppSelector((s) => s.news.articles)
  const source = useAppSelector((s) => s.news.source)
  const loading = useAppSelector((s) => s.news.loading)
  const error = useAppSelector((s) => s.news.error)
  const trending = useAppSelector((s) => s.news.trending)
  const hotspotsOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'news-hotspots')?.visible ?? false)

  // load the selected category's feed
  useEffect(() => {
    let cancelled = false
    dispatch(feedStart())
    fetchNewsFeed(category)
      .then((r) => {
        if (!cancelled) dispatch(feedOk({ articles: r.articles, source: r.source }))
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
          dispatch(feedError(msg || 'News unavailable — is the WorldEye API running?'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [category, dispatch])

  // load trending once
  useEffect(() => {
    let cancelled = false
    fetchNewsTrending()
      .then((r) => {
        if (!cancelled) dispatch(trendingOk(r.topics))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [dispatch])

  return (
    <PanelShell
      title="News Intelligence"
      subtitle="Module 11 · global news, mapped"
      icon={<Newspaper size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* category tabs */}
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => dispatch(setCategory(id))}
            className={cx(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors',
              category === id
                ? 'border-we-accent/60 bg-we-accent/15 text-we-accent'
                : 'border-we-border text-we-muted hover:text-we-text',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* trending */}
      {trending.length > 0 && (
        <>
          <SectionTitle>Trending</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {trending.map((t) => (
              <span
                key={t.term}
                className="rounded-full border border-we-border bg-we-panel-2/40 px-2 py-0.5 text-[10px] text-we-text"
                title={`${t.count} mentions`}
              >
                {t.term}
              </span>
            ))}
          </div>
        </>
      )}

      {/* feed */}
      <div className="mt-3 mb-1 flex items-center justify-between">
        <SectionTitle>{TABS.find((t) => t.id === category)?.label} headlines</SectionTitle>
        {source && <span className="text-[9px] text-we-muted">{source === 'sim' ? 'sample' : 'live'}</span>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3 text-[11px] text-we-muted">
          <Loader2 size={13} className="animate-spin" /> Loading headlines…
        </div>
      )}
      {error && <div className="py-2 text-[11px] text-we-warn">{error}</div>}

      <div className="space-y-1.5">
        {!loading && articles.map((a) => <ArticleRow key={a.id} a={a} />)}
      </div>

      {/* map toggle */}
      <SectionTitle>Map</SectionTitle>
      <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs text-we-text">News hotspots</div>
          <div className="text-[10px] text-we-muted">Where news is happening (geoparsed)</div>
        </div>
        <Switch checked={hotspotsOn} onChange={() => dispatch(toggleLayer('news-hotspots'))} />
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Source: Google News RSS — free, no keys. Locations inferred from headlines.
      </p>
    </PanelShell>
  )
}

function ArticleRow({ a }: { a: NewsArticle }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-we-border bg-we-panel-2/30 p-2.5 hover:border-we-border-2"
    >
      <div className="flex items-start gap-1.5">
        <span className="flex-1 text-[11px] leading-snug text-we-text">{a.title}</span>
        <ExternalLink size={11} className="mt-0.5 shrink-0 text-we-muted" />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-we-muted">
        {a.source && <span className="truncate">{a.source}</span>}
        {a.publishedAt && <span>· {timeAgo(a.publishedAt)}</span>}
        {a.place && (
          <span className="flex items-center gap-0.5 text-we-accent">
            <MapPin size={9} /> {a.place}
          </span>
        )}
      </div>
    </a>
  )
}
