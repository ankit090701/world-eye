import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { BasemapId, CameraView, ProjectionType } from '../types'

interface MapState {
  basemap: BasemapId
  projection: ProjectionType
  /** bumped every time the base style finishes (re)loading, so overlay syncers re-apply */
  styleEpoch: number
  view: CameraView
  cursor: { lng: number; lat: number } | null
}

const initialState: MapState = {
  basemap: 'dark',
  projection: 'globe',
  styleEpoch: 0,
  view: { lng: 10, lat: 25, zoom: 1.6, pitch: 0, bearing: 0 },
  cursor: null,
}

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setBasemap(state, action: PayloadAction<BasemapId>) {
      state.basemap = action.payload
    },
    setProjection(state, action: PayloadAction<ProjectionType>) {
      state.projection = action.payload
    },
    toggleProjection(state) {
      state.projection = state.projection === 'globe' ? 'mercator' : 'globe'
    },
    bumpStyleEpoch(state) {
      state.styleEpoch += 1
    },
    setView(state, action: PayloadAction<CameraView>) {
      state.view = action.payload
    },
    setCursor(state, action: PayloadAction<{ lng: number; lat: number } | null>) {
      state.cursor = action.payload
    },
  },
})

export const {
  setBasemap,
  setProjection,
  toggleProjection,
  bumpStyleEpoch,
  setView,
  setCursor,
} = mapSlice.actions
export default mapSlice.reducer
