import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShipCategory } from '../types'
import { SHIP_CATEGORIES } from '../config/shipTypes'

interface ShipUIState {
  selectedMmsi: number | null
  follow: boolean
  /** null = show all categories; otherwise only the listed categories */
  categoryFilter: ShipCategory[] | null
  status: 'idle' | 'loading' | 'ok' | 'error'
  source: 'live' | 'sim' | null
  count: number
  lastUpdated: number | null
  error: string | null
}

const initialState: ShipUIState = {
  selectedMmsi: null,
  follow: false,
  categoryFilter: null,
  status: 'idle',
  source: null,
  count: 0,
  lastUpdated: null,
  error: null,
}

const shipSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    selectShip(state, action: PayloadAction<number | null>) {
      state.selectedMmsi = action.payload
      if (action.payload == null) state.follow = false
    },
    toggleShipFollow(state) {
      state.follow = !state.follow
    },
    toggleCategory(state, action: PayloadAction<ShipCategory>) {
      const cat = action.payload
      const cur = state.categoryFilter
      if (cur == null) {
        // was "all" -> first click hides only the clicked type
        state.categoryFilter = SHIP_CATEGORIES.filter((c) => c !== cat)
      } else if (cur.includes(cat)) {
        const next = cur.filter((c) => c !== cat)
        state.categoryFilter = next.length ? next : null
      } else {
        const next = [...cur, cat]
        // re-selecting everything collapses back to the "all" state
        state.categoryFilter = next.length === SHIP_CATEGORIES.length ? null : next
      }
    },
    clearCategoryFilter(state) {
      state.categoryFilter = null
    },
    shipFeedOk(
      state,
      action: PayloadAction<{ source: 'live' | 'sim'; count: number; lastUpdated: number }>,
    ) {
      state.status = 'ok'
      state.source = action.payload.source
      state.count = action.payload.count
      state.lastUpdated = action.payload.lastUpdated
      state.error = null
    },
    shipFeedError(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  selectShip,
  toggleShipFollow,
  toggleCategory,
  clearCategoryFilter,
  shipFeedOk,
  shipFeedError,
} = shipSlice.actions
export default shipSlice.reducer
