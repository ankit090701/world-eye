import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { SatGroup } from '../types'

export interface GroupMeta {
  count: number
  source: 'live' | 'sim' | null
  loading: boolean
}

interface SatelliteState {
  selectedId: number | null
  query: string
  meta: Record<SatGroup, GroupMeta>
}

const emptyMeta: GroupMeta = { count: 0, source: null, loading: false }

const initialState: SatelliteState = {
  selectedId: null,
  query: '',
  meta: {
    iss: { ...emptyMeta },
    active: { ...emptyMeta },
    starlink: { ...emptyMeta },
    debris: { ...emptyMeta },
    launches: { ...emptyMeta },
  },
}

const satelliteSlice = createSlice({
  name: 'satellites',
  initialState,
  reducers: {
    selectSat(state, action: PayloadAction<number | null>) {
      state.selectedId = action.payload
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    groupLoading(state, action: PayloadAction<{ group: SatGroup; loading: boolean }>) {
      state.meta[action.payload.group].loading = action.payload.loading
    },
    groupMeta(state, action: PayloadAction<{ group: SatGroup; count: number; source: 'live' | 'sim' }>) {
      const m = state.meta[action.payload.group]
      m.count = action.payload.count
      m.source = action.payload.source
      m.loading = false
    },
  },
})

export const { selectSat, setQuery, groupLoading, groupMeta } = satelliteSlice.actions
export default satelliteSlice.reducer
