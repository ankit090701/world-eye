import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { TrainCategory, TrainRoute } from '../types'
import { TRAIN_CATEGORIES } from '../config/trainTypes'

interface TrainUIState {
  selectedId: string | null
  follow: boolean
  categoryFilter: TrainCategory[] | null
  selectedRoute: TrainRoute | null
  routeLoading: boolean
  status: 'idle' | 'loading' | 'ok' | 'error'
  source: 'live' | 'sim' | null
  count: number
  lastUpdated: number | null
  error: string | null
}

const initialState: TrainUIState = {
  selectedId: null,
  follow: false,
  categoryFilter: null,
  selectedRoute: null,
  routeLoading: false,
  status: 'idle',
  source: null,
  count: 0,
  lastUpdated: null,
  error: null,
}

const trainSlice = createSlice({
  name: 'train',
  initialState,
  reducers: {
    selectTrain(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload
      state.selectedRoute = null
      if (action.payload == null) state.follow = false
    },
    toggleTrainFollow(state) {
      state.follow = !state.follow
    },
    toggleTrainCategory(state, action: PayloadAction<TrainCategory>) {
      const cat = action.payload
      const cur = state.categoryFilter
      if (cur == null) {
        state.categoryFilter = TRAIN_CATEGORIES.filter((c) => c !== cat)
      } else if (cur.includes(cat)) {
        const next = cur.filter((c) => c !== cat)
        state.categoryFilter = next.length ? next : null
      } else {
        const next = [...cur, cat]
        state.categoryFilter = next.length === TRAIN_CATEGORIES.length ? null : next
      }
    },
    clearTrainCategoryFilter(state) {
      state.categoryFilter = null
    },
    setRouteLoading(state, action: PayloadAction<boolean>) {
      state.routeLoading = action.payload
    },
    setTrainRoute(state, action: PayloadAction<TrainRoute | null>) {
      state.selectedRoute = action.payload
      state.routeLoading = false
    },
    trainFeedOk(
      state,
      action: PayloadAction<{ source: 'live' | 'sim'; count: number; lastUpdated: number }>,
    ) {
      state.status = 'ok'
      state.source = action.payload.source
      state.count = action.payload.count
      state.lastUpdated = action.payload.lastUpdated
      state.error = null
    },
    trainFeedError(state, action: PayloadAction<string>) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  selectTrain,
  toggleTrainFollow,
  toggleTrainCategory,
  clearTrainCategoryFilter,
  setRouteLoading,
  setTrainRoute,
  trainFeedOk,
  trainFeedError,
} = trainSlice.actions
export default trainSlice.reducer
