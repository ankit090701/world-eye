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

/** Opening camera (and the "back to world" target): Europe-centred so live feeds have data, zoomed so the globe fits the screen. */
export function defaultView(
  width = typeof window !== 'undefined' ? window.innerWidth : 1920,
  height = typeof window !== 'undefined' ? window.innerHeight : 1080,
): CameraView {
  const phone = width < 640 || height < 500
  const zoom = phone ? 0.9 : width < 1024 ? 1.8 : 2.1
  return { lng: 12, lat: 42, zoom, pitch: 0, bearing: 0 }
}

const initialState: MapState = {
  basemap: 'light',
  projection: 'globe',
  styleEpoch: 0,
  view: defaultView(),
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
