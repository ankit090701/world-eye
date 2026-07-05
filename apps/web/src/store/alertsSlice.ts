import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlertEvent, AlertRule, ChannelConfig } from '../types'

const RULES_KEY = 'we-alert-rules'
const CHANNELS_KEY = 'we-alert-channels'
const EVENTS_MAX = 100

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const DEFAULT_CHANNELS: ChannelConfig = {
  slack: { enabled: false, url: '' },
  discord: { enabled: false, url: '' },
  webhook: { enabled: false, url: '' },
  email: { enabled: false, address: '' },
  sms: { enabled: false, number: '' },
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'default-emergency',
    name: 'Aircraft emergency squawk',
    type: 'emergency',
    enabled: true,
    severity: 'critical',
    source: 'aircraft',
    params: {},
    channels: ['inapp'],
    createdAt: 0,
  },
  {
    id: 'default-quake',
    name: 'Major earthquake (M5+)',
    type: 'earthquake',
    enabled: true,
    severity: 'warning',
    source: 'aircraft',
    params: { minMag: 5 },
    channels: ['inapp'],
    createdAt: 0,
  },
]

function loadRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (raw) return JSON.parse(raw) as AlertRule[]
  } catch {
    /* ignore */
  }
  return DEFAULT_RULES
}
function loadChannels(): ChannelConfig {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY)
    if (raw) return { ...DEFAULT_CHANNELS, ...(JSON.parse(raw) as ChannelConfig) }
  } catch {
    /* ignore */
  }
  return DEFAULT_CHANNELS
}

export function persistAlerts(rules: AlertRule[], channels: ChannelConfig) {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
    localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels))
  } catch {
    /* ignore */
  }
}

interface AlertsState {
  rules: AlertRule[]
  events: AlertEvent[]
  channels: ChannelConfig
}

const initialState: AlertsState = {
  rules: loadRules(),
  events: [],
  channels: loadChannels(),
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addRule(state, action: PayloadAction<AlertRule>) {
      state.rules.unshift(action.payload)
    },
    deleteRule(state, action: PayloadAction<string>) {
      state.rules = state.rules.filter((r) => r.id !== action.payload)
    },
    toggleRule(state, action: PayloadAction<string>) {
      const r = state.rules.find((x) => x.id === action.payload)
      if (r) r.enabled = !r.enabled
    },
    addEvent(state, action: PayloadAction<AlertEvent>) {
      state.events.unshift(action.payload)
      if (state.events.length > EVENTS_MAX) state.events.length = EVENTS_MAX
    },
    clearEvents(state) {
      state.events = []
    },
    setChannel(
      state,
      action: PayloadAction<{ key: keyof ChannelConfig; patch: Partial<ChannelConfig[keyof ChannelConfig]> }>,
    ) {
      Object.assign(state.channels[action.payload.key], action.payload.patch)
    },
  },
})

export const { addRule, deleteRule, toggleRule, addEvent, clearEvents, setChannel } = alertsSlice.actions
export default alertsSlice.reducer
