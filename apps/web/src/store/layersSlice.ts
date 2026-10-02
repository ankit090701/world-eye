import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LayerState } from '../types'
import { DEFAULT_LAYERS } from '../config/layers'
import { setActiveTool } from './uiSlice'
import { selectSat } from './satelliteSlice'
import { lookupOk } from './domainSlice'
import { addRule } from './alertsSlice'

interface LayersState {
  items: LayerState[]
}

function show(state: LayersState, ...ids: string[]) {
  for (const layer of state.items) if (ids.includes(layer.id)) layer.visible = true
}

const initialState: LayersState = {
  // deep copy so the default template is never mutated
  items: DEFAULT_LAYERS.map((l) => ({ ...l })),
}

const layersSlice = createSlice({
  name: 'layers',
  initialState,
  reducers: {
    setLayerVisible(state, action: PayloadAction<{ id: string; visible: boolean }>) {
      const layer = state.items.find((l) => l.id === action.payload.id)
      if (layer) layer.visible = action.payload.visible
    },
    toggleLayer(state, action: PayloadAction<string>) {
      const layer = state.items.find((l) => l.id === action.payload)
      if (layer) layer.visible = !layer.visible
    },
    setLayerOpacity(state, action: PayloadAction<{ id: string; opacity: number }>) {
      const layer = state.items.find((l) => l.id === action.payload.id)
      if (layer) layer.opacity = action.payload.opacity
    },
  },
  // All layers start hidden, so the ones that show the user's own work turn on when
  // that work happens — a new drawing, selection, lookup or rule never lands unseen.
  extraReducers: (builder) => {
    builder
      .addCase(setActiveTool, (state, action) => {
        if (action.payload.startsWith('draw-')) show(state, 'drawings')
      })
      .addCase(selectSat, (state, action) => {
        if (action.payload !== null) show(state, 'sat-orbits')
      })
      .addCase(lookupOk, (state) => show(state, 'domain-infra'))
      .addCase(addRule, (state) => show(state, 'alert-zones', 'alert-events'))
  },
})

export const { setLayerVisible, toggleLayer, setLayerOpacity } = layersSlice.actions
export default layersSlice.reducer
