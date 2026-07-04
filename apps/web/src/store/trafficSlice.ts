import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { IncidentType } from '../types'
import { INCIDENT_TYPES } from '../config/trafficTypes'

interface TrafficUIState {
  selectedIncidentId: string | null
  typeFilter: IncidentType[] | null
  status: 'idle' | 'loading' | 'ok' | 'error'
  source: 'live' | 'sim' | null
  incidentCount: number
  flowCount: number
  lastUpdated: number | null
  error: string | null
}

const initialState: TrafficUIState = {
  selectedIncidentId: null,
  typeFilter: null,
  status: 'idle',
  source: null,
  incidentCount: 0,
  flowCount: 0,
  lastUpdated: null,
  error: null,
}

const trafficSlice = createSlice({
  name: 'traffic',
  initialState,
  reducers: {
    selectIncident(state, action: PayloadAction<string | null>) {
      state.selectedIncidentId = action.payload
    },
    toggleIncidentType(state, action: PayloadAction<IncidentType>) {
      const c = action.payload
      const cur = state.typeFilter
      if (cur == null) state.typeFilter = INCIDENT_TYPES.filter((x) => x !== c)
      else if (cur.includes(c)) {
        const next = cur.filter((x) => x !== c)
        state.typeFilter = next.length ? next : null
      } else {
        const next = [...cur, c]
        state.typeFilter = next.length === INCIDENT_TYPES.length ? null : next
      }
    },
    clearTypeFilter(state) {
      state.typeFilter = null
    },
    trafficFeedOk(
      state,
      action: PayloadAction<{
        source: 'live' | 'sim'
        incidentCount: number
        flowCount: number
        lastUpdated: number
      }>,
    ) {
      state.status = 'ok'
      state.source = action.payload.source
      state.incidentCount = action.payload.incidentCount
      state.flowCount = action.payload.flowCount
      state.lastUpdated = action.payload.lastUpdated
      state.error = null
    },
    trafficFeedError(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  selectIncident,
  toggleIncidentType,
  clearTypeFilter,
  trafficFeedOk,
  trafficFeedError,
} = trafficSlice.actions
export default trafficSlice.reducer
