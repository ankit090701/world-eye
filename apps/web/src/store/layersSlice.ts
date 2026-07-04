import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { LayerState } from '../types'
import { DEFAULT_LAYERS } from '../config/layers'

interface LayersState {
  items: LayerState[]
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
})

export const { setLayerVisible, toggleLayer, setLayerOpacity } = layersSlice.actions
export default layersSlice.reducer
