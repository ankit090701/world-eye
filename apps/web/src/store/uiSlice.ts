import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PanelId, ToolId } from '../types'

interface UIState {
  activePanel: PanelId
  activeTool: ToolId
  /** phone-only panel launcher sheet */
  menuOpen: boolean
  /** transient toast/status message */
  toast: string | null
}

const initialState: UIState = {
  // Phones and portrait tablets open on the bare globe; wider screens have room for the layers panel beside it.
  activePanel: typeof window !== 'undefined' && window.innerWidth < 1024 ? null : 'layers',
  activeTool: 'none',
  menuOpen: false,
  toast: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActivePanel(state, action: PayloadAction<PanelId>) {
      // clicking the active panel toggles it closed
      state.activePanel = state.activePanel === action.payload ? null : action.payload
      state.menuOpen = false
    },
    openPanel(state, action: PayloadAction<Exclude<PanelId, null>>) {
      // non-toggling: always open the given panel
      state.activePanel = action.payload
      state.menuOpen = false
    },
    setActiveTool(state, action: PayloadAction<ToolId>) {
      state.activeTool = state.activeTool === action.payload ? 'none' : action.payload
    },
    setMenuOpen(state, action: PayloadAction<boolean>) {
      state.menuOpen = action.payload
    },
    setToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload
    },
  },
})

export const { setActivePanel, openPanel, setActiveTool, setMenuOpen, setToast } = uiSlice.actions
export default uiSlice.reducer
