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
import { persistBookmarks } from './bookmarksSlice'

export const store = configureStore({
  reducer: {
    ui, map, layers, bookmarks, timeline, aircraft, ship, train, fleet, traffic, cyber, domain, weather, satellites, news, social,
  },
})

// Persist bookmarks to localStorage whenever they change.
let lastBookmarks = store.getState().bookmarks.items
store.subscribe(() => {
  const current = store.getState().bookmarks.items
  if (current !== lastBookmarks) {
    lastBookmarks = current
    persistBookmarks(current)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
