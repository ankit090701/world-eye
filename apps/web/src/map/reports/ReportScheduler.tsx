import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { addRecent, markRun, newReportId } from '../../store/reportsSlice'
import { setToast } from '../../store/uiSlice'
import { buildReport, toMarkdown } from '../../lib/reportBuilder'
import { deliverAlert } from '../../api/alertsApi'
import type { ScheduledReport } from '../../types'

// In-app scheduler: while the app is open, generates due scheduled reports and
// (optionally) delivers a summary to a webhook. Production would run this on the
// server/worker with a cron — same report builder, same delivery relay.
export function ReportScheduler() {
  const dispatch = useAppDispatch()
  const schedules = useAppSelector((s) => s.reports.scheduled)
  const ref = useRef<ScheduledReport[]>(schedules)
  ref.current = schedules

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      for (const s of ref.current) {
        if (!s.enabled) continue
        if (now - s.lastRun < s.intervalMin * 60_000) continue
        const report = buildReport(s.kind)
        const md = toMarkdown(report)
        dispatch(addRecent({ id: newReportId(), title: report.title, kind: s.kind, at: now, markdown: md }))
        dispatch(markRun({ id: s.id, at: now }))
        dispatch(setToast(`📄 Scheduled report generated — ${report.title}`))
        if (s.delivery === 'webhook' && s.webhookUrl) {
          const summary = report.sections.find((x) => x.kind === 'text')?.text ?? ''
          deliverAlert('webhook', s.webhookUrl, `${report.title} · ${report.generatedAt}\n${summary}`.slice(0, 3500))
        }
      }
    }
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [dispatch])

  return null
}
