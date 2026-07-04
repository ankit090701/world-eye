import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AircraftUIState {
  selectedHex: string | null
  follow: boolean
  emergencyOnly: boolean
  status: 'idle' | 'loading' | 'ok' | 'error'
  source: 'live' | 'sim' | null
  count: number
  lastUpdated: number | null
  error: string | null
}

const initialState: AircraftUIState = {
  selectedHex: null,
  follow: false,
  emergencyOnly: false,
  status: 'idle',
  source: null,
  count: 0,
  lastUpdated: null,
  error: null,
}

const aircraftSlice = createSlice({
  name: 'aircraft',
  initialState,
  reducers: {
    selectAircraft(state, action: PayloadAction<string | null>) {
      state.selectedHex = action.payload
      if (!action.payload) state.follow = false
    },
    toggleFollow(state) {
      state.follow = !state.follow
    },
    setFollow(state, action: PayloadAction<boolean>) {
      state.follow = action.payload
    },
    setEmergencyOnly(state, action: PayloadAction<boolean>) {
      state.emergencyOnly = action.payload
    },
    feedLoading(state) {
      state.status = 'loading'
    },
    feedOk(
      state,
      action: PayloadAction<{ source: 'live' | 'sim'; count: number; lastUpdated: number }>,
    ) {
      state.status = 'ok'
      state.source = action.payload.source
      state.count = action.payload.count
      state.lastUpdated = action.payload.lastUpdated
      state.error = null
    },
    feedError(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  selectAircraft,
  toggleFollow,
  setFollow,
  setEmergencyOnly,
  feedLoading,
  feedOk,
  feedError,
} = aircraftSlice.actions
export default aircraftSlice.reducer
