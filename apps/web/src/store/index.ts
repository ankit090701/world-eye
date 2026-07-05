import { configureStore } from '@reduxjs/toolkit'
import ui from './uiSlice'
import map from './mapSlice'
import layers from './layersSlice'
import bookmarks from './bookmarksSlice'
import timeline from './timelineSlice'
import aircraft from './aircraftSlice'
import ship from './shipSlice'
import train from './trainSlice'
import fleet from './fleetSlice'
import traffic from './trafficSlice'
import cyber from './cyberSlice'
import domain from './domainSlice'
import weather from './weatherSlice'
import satellites from './satelliteSlice'
import news from './newsSlice'
import social from './socialSlice'
import osint from './osintSlice'
import alerts from './alertsSlice'
import ai from './aiSlice'
import reports from './reportsSlice'
import admin from './adminSlice'
import { persistBookmarks } from './bookmarksSlice'
import { persistAlerts } from './alertsSlice'
import { persistSchedules } from './reportsSlice'
import { persistAdmin } from './adminSlice'
import { auditMiddleware } from './auditMiddleware'
import { installUsageTracker } from '../data/usageStore'

// Real API-usage analytics for the Admin panel — installed at app boot.
installUsageTracker()

export const store = configureStore({
  reducer: {
    ui, map, layers, bookmarks, timeline, aircraft, ship, train, fleet, traffic, cyber, domain, weather, satellites, news, social, osint, alerts, ai, reports, admin,
  },
  middleware: (getDefault) => getDefault().concat(auditMiddleware),
})

// Persist bookmarks + alert rules/channels to localStorage whenever they change.
let lastBookmarks = store.getState().bookmarks.items
let lastRules = store.getState().alerts.rules
let lastChannels = store.getState().alerts.channels
let lastSchedules = store.getState().reports.scheduled
let lastUsers = store.getState().admin.users
let lastKeys = store.getState().admin.apiKeys
let lastOrgs = store.getState().admin.orgs
store.subscribe(() => {
  const s = store.getState()
  if (s.bookmarks.items !== lastBookmarks) {
    lastBookmarks = s.bookmarks.items
    persistBookmarks(s.bookmarks.items)
  }
  if (s.alerts.rules !== lastRules || s.alerts.channels !== lastChannels) {
    lastRules = s.alerts.rules
    lastChannels = s.alerts.channels
    persistAlerts(s.alerts.rules, s.alerts.channels)
  }
  if (s.reports.scheduled !== lastSchedules) {
    lastSchedules = s.reports.scheduled
    persistSchedules(s.reports.scheduled)
  }
  if (s.admin.users !== lastUsers || s.admin.apiKeys !== lastKeys || s.admin.orgs !== lastOrgs) {
    lastUsers = s.admin.users
    lastKeys = s.admin.apiKeys
    lastOrgs = s.admin.orgs
    persistAdmin(s.admin.users, s.admin.apiKeys, s.admin.orgs)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
