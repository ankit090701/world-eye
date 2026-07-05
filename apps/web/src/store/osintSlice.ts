import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { OsintKind, OsintResponse } from '../types'

interface OsintState {
  kind: OsintKind
  query: string
  country: string
  report: OsintResponse | null
  loading: boolean
  error: string | null
}

const initialState: OsintState = {
  kind: 'email',
  query: '',
  country: 'US',
  report: null,
  loading: false,
  error: null,
}

const osintSlice = createSlice({
  name: 'osint',
  initialState,
  reducers: {
    setKind(state, action: PayloadAction<OsintKind>) {
      state.kind = action.payload
      state.report = null
      state.error = null
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    setCountry(state, action: PayloadAction<string>) {
      state.country = action.payload
    },
    lookupStart(state) {
      state.loading = true
      state.error = null
    },
    lookupOk(state, action: PayloadAction<OsintResponse>) {
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

export const { setKind, setQuery, setCountry, lookupStart, lookupOk, lookupError, clearReport } =
  osintSlice.actions
export default osintSlice.reducer
