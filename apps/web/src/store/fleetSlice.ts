import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { VehicleStatus } from '../types'
import { VEHICLE_STATUSES } from '../config/fleetTypes'

interface FleetUIState {
  selectedId: string | null
  follow: boolean
  statusFilter: VehicleStatus[] | null
  depot: { lat: number; lon: number } | null
  status: 'idle' | 'loading' | 'ok' | 'error'
  count: number
  alertCount: number
  lastUpdated: number | null
  error: string | null
}

const initialState: FleetUIState = {
  selectedId: null,
  follow: false,
  statusFilter: null,
  depot: null,
  status: 'idle',
  count: 0,
  alertCount: 0,
  lastUpdated: null,
  error: null,
}

const fleetSlice = createSlice({
  name: 'fleet',
  initialState,
  reducers: {
    selectVehicle(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
      if (action.payload == null) state.follow = false
    },
    toggleFleetFollow(state) {
      state.follow = !state.follow
    },
    toggleStatusFilter(state, action: PayloadAction<VehicleStatus>) {
      const s = action.payload
      const cur = state.statusFilter
      if (cur == null) state.statusFilter = VEHICLE_STATUSES.filter((x) => x !== s)
      else if (cur.includes(s)) {
        const next = cur.filter((x) => x !== s)
        state.statusFilter = next.length ? next : null
      } else {
        const next = [...cur, s]
        state.statusFilter = next.length === VEHICLE_STATUSES.length ? null : next
      }
    },
    clearStatusFilter(state) {
      state.statusFilter = null
    },
    setDepot(state, action: PayloadAction<{ lat: number; lon: number } | null>) {
      state.depot = action.payload
    },
    fleetFeedOk(
      state,
      action: PayloadAction<{ count: number; alertCount: number; lastUpdated: number }>,
    ) {
      state.status = 'ok'
      state.count = action.payload.count
      state.alertCount = action.payload.alertCount
      state.lastUpdated = action.payload.lastUpdated
      state.error = null
    },
    fleetFeedError(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  selectVehicle,
  toggleFleetFollow,
  toggleStatusFilter,
  clearStatusFilter,
  setDepot,
  fleetFeedOk,
  fleetFeedError,
} = fleetSlice.actions
export default fleetSlice.reducer
