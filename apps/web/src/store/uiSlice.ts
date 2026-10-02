import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PanelId, ToolId } from '../types'

interface UIState {
  activePanel: PanelId
  activeTool: ToolId
  /** transient toast/status message */
  toast: string | null
}

const initialState: UIState = {
  activePanel: 'layers',
  activeTool: 'none',
  toast: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActivePanel(state, action: PayloadAction<PanelId>) {
      // clicking the active panel toggles it closed
      state.activePanel = state.activePanel === action.payload ? null : action.payload
    },
    openPanel(state, action: PayloadAction<Exclude<PanelId, null>>) {
      // non-toggling: always open the given panel
      state.activePanel = action.payload
    },
    setActiveTool(state, action: PayloadAction<ToolId>) {
      state.activeTool = state.activeTool === action.payload ? 'none' : action.payload
    },
    setToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload
    },
  },
})

export const { setActivePanel, openPanel, setActiveTool, setToast } = uiSlice.actions
export default uiSlice.reducer
