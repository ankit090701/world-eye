import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { DomainReport } from '../types'

interface DomainUIState {
  query: string
  report: DomainReport | null
  loading: boolean
  error: string | null
}

const initialState: DomainUIState = {
  query: '',
  report: null,
  loading: false,
  error: null,
}

const domainSlice = createSlice({
  name: 'domain',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    lookupStart(state) {
      state.loading = true
      state.error = null
    },
    lookupOk(state, action: PayloadAction<DomainReport>) {
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
  },
})

export const { setQuery, lookupStart, lookupOk, lookupError, clearReport } = domainSlice.actions
export default domainSlice.reducer
