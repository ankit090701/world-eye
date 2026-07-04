import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CyberReport } from '../types'

interface CyberUIState {
  query: string
  report: CyberReport | null
  loading: boolean
  error: string | null
  threatSource: 'live' | 'sim' | null
  threatCount: number
}

const initialState: CyberUIState = {
  query: '',
  report: null,
  loading: false,
  error: null,
  threatSource: null,
  threatCount: 0,
}

const cyberSlice = createSlice({
  name: 'cyber',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    lookupStart(state) {
      state.loading = true
      state.error = null
    },
    lookupOk(state, action: PayloadAction<CyberReport>) {
      state.loading = false
      state.report = action.payload
      state.error = null
    },
    lookupError(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    },
    clearReport(state) {
      state.report = null
      state.error = null
    },
    threatFeedOk(state, action: PayloadAction<{ source: 'live' | 'sim'; count: number }>) {
      state.threatSource = action.payload.source
      state.threatCount = action.payload.count
    },
  },
})

export const { setQuery, lookupStart, lookupOk, lookupError, clearReport, threatFeedOk } =
  cyberSlice.actions
export default cyberSlice.reducer
