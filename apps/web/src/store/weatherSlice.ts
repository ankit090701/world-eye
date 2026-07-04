import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CurrentConditions } from '../types'

interface WeatherUIState {
  current: CurrentConditions | null
  loading: boolean
  error: string | null
}

const initialState: WeatherUIState = {
  current: null,
  loading: false,
  error: null,
}

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    currentStart(state) {
      state.loading = true
      state.error = null
    },
    currentOk(state, action: PayloadAction<CurrentConditions>) {
      state.loading = false
      state.current = action.payload
      state.error = null
    },
    currentError(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    },
    clearCurrent(state) {
      state.current = null
      state.error = null
    },
  },
})

export const { currentStart, currentOk, currentError, clearCurrent } = weatherSlice.actions
export default weatherSlice.reducer
