import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GeneratedReport, ScheduledReport } from '../types'

const SCHED_KEY = 'we-report-schedules'
const RECENT_MAX = 12

export function newReportId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function loadSchedules(): ScheduledReport[] {
  try {
    const raw = localStorage.getItem(SCHED_KEY)
    if (raw) return JSON.parse(raw) as ScheduledReport[]
  } catch {
    /* ignore */
  }
  return []
}

export function persistSchedules(s: ScheduledReport[]) {
  try {
    localStorage.setItem(SCHED_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

interface ReportsState {
  scheduled: ScheduledReport[]
  recent: GeneratedReport[]
}

const initialState: ReportsState = { scheduled: loadSchedules(), recent: [] }

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    addSchedule(state, action: PayloadAction<ScheduledReport>) {
      state.scheduled.unshift(action.payload)
    },
    deleteSchedule(state, action: PayloadAction<string>) {
      state.scheduled = state.scheduled.filter((s) => s.id !== action.payload)
    },
    toggleSchedule(state, action: PayloadAction<string>) {
      const s = state.scheduled.find((x) => x.id === action.payload)
      if (s) s.enabled = !s.enabled
    },
    markRun(state, action: PayloadAction<{ id: string; at: number }>) {
      const s = state.scheduled.find((x) => x.id === action.payload.id)
      if (s) s.lastRun = action.payload.at
    },
    addRecent(state, action: PayloadAction<GeneratedReport>) {
      state.recent.unshift(action.payload)
      if (state.recent.length > RECENT_MAX) state.recent.length = RECENT_MAX
    },
    clearRecent(state) {
      state.recent = []
    },
  },
})

export const { addSchedule, deleteSchedule, toggleSchedule, markRun, addRecent, clearRecent } = reportsSlice.actions
export default reportsSlice.reducer
