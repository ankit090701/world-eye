import { useEffect } from 'react'
import {
  Share2,
  MessageCircle,
  TrendingUp,
  Video,
  Hash,
  Send,
  ExternalLink,
  Loader2,
  MapPin,
} from 'lucide-react'
import { PanelShell, SectionTitle, Switch } from '../ui'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setActivePanel } from '../../store/uiSlice'
import { toggleLayer } from '../../store/layersSlice'
import { feedError, feedOk, feedStart, setSource } from '../../store/socialSlice'
import { fetchSocialFeed } from '../../api/socialApi'
import type { SocialPost, SocialSource } from '../../types'
import { cx } from '../../lib/cx'

const TABS: { id: SocialSource; label: string; icon: typeof Hash }[] = [
  { id: 'reddit', label: 'Reddit', icon: MessageCircle },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'youtube', label: 'YouTube', icon: Video },
  { id: 'hn', label: 'Hacker News', icon: Hash },
  { id: 'telegram', label: 'Telegram', icon: Send },
]

function timeAgo(ms: number | null): string {
  if (!ms) return ''
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function SocialPanel() {
  const dispatch = useAppDispatch()
  const source = useAppSelector((s) => s.social.source)
  const posts = useAppSelector((s) => s.social.posts)
  const origin = useAppSelector((s) => s.social.origin)
  const loading = useAppSelector((s) => s.social.loading)
  const error = useAppSelector((s) => s.social.error)
  const buzzOn = useAppSelector((s) => s.layers.items.find((l) => l.id === 'social-buzz')?.visible ?? false)

  useEffect(() => {
    let cancelled = false
    dispatch(feedStart())
    fetchSocialFeed(source)
      .then((r) => {
        if (!cancelled) dispatch(feedOk({ posts: r.posts, origin: r.origin }))
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error && err.message && !err.message.startsWith('HTTP') ? err.message : null
          dispatch(feedError(msg || 'Social feed unavailable — is the WorldEye API running?'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [source, dispatch])

  return (
    <PanelShell
      title="Social Intelligence"
      subtitle="Module 12 · trends & public posts"
      icon={<Share2 size={16} />}
      onClose={() => dispatch(setActivePanel(null))}
    >
      {/* source tabs */}
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => dispatch(setSource(id))}
            className={cx(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors',
              source === id
                ? 'border-we-accent/60 bg-we-accent/15 text-we-accent'
                : 'border-we-border text-we-muted hover:text-we-text',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 mb-1 flex items-center justify-between">
        <SectionTitle>{TABS.find((t) => t.id === source)?.label}</SectionTitle>
        {origin && <span className="text-[9px] text-we-muted">{origin === 'sim' ? 'sample' : 'live'}</span>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3 text-[11px] text-we-muted">
          <Loader2 size={13} className="animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="py-2 text-[11px] text-we-warn">{error}</div>}

      <div className="space-y-1.5">{!loading && posts.map((p) => <PostRow key={p.id} p={p} />)}</div>

      {/* map toggle */}
      <SectionTitle>Map</SectionTitle>
      <div className="flex items-center justify-between rounded-lg border border-we-border bg-we-panel-2/40 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs text-we-text">Social buzz</div>
          <div className="text-[10px] text-we-muted">Where conversation is focused (geoparsed)</div>
        </div>
        <Switch checked={buzzOn} onChange={() => dispatch(toggleLayer('social-buzz'))} />
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-we-muted">
        Sources: Reddit · Google Trends · Hacker News · YouTube (Piped) · Telegram — all free, no keys.
        X/Twitter's API is paid, so Google Trends stands in for search-trend signals.
      </p>
    </PanelShell>
  )
}

function PostRow({ p }: { p: SocialPost }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-we-border bg-we-panel-2/30 p-2.5 hover:border-we-border-2"
    >
      <div className="flex items-start gap-1.5">
        <span className="flex-1 text-[11px] leading-snug text-we-text">{p.title}</span>
        <ExternalLink size={11} className="mt-0.5 shrink-0 text-we-muted" />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-we-muted">
        {p.author && <span className="truncate text-we-accent">{p.author}</span>}
        {p.meta && <span>· {p.meta}</span>}
        {p.publishedAt && <span>· {timeAgo(p.publishedAt)}</span>}
        {p.place && (
          <span className="flex items-center gap-0.5">
            <MapPin size={9} /> {p.place}
          </span>
        )}
      </div>
    </a>
  )
}
