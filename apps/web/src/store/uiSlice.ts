import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PanelId, Theme, ToolId } from '../types'

interface UIState {
  theme: Theme
  activePanel: PanelId
  activeTool: ToolId
  /** transient toast/status message */
  toast: string | null
}

const initialState: UIState = {
  theme: 'dark',
  activePanel: 'layers',
  activeTool: 'none',
  toast: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
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

export const { setTheme, toggleTheme, setActivePanel, openPanel, setActiveTool, setToast } =
  uiSlice.actions
export default uiSlice.reducer
