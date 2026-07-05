import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AiMessage } from '../types'

interface AiState {
  messages: AiMessage[]
}

const WELCOME: AiMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'I\'m the WorldEye assistant. Ask me for a “situation summary”, “current risk”, “any anomalies”, or about any tracked domain (aircraft, ships, weather, cyber threats, satellites…). Type “help” for options.',
  time: 0,
}

const initialState: AiState = { messages: [WELCOME] }

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<AiMessage>) {
      state.messages.push(action.payload)
      if (state.messages.length > 100) state.messages.splice(0, state.messages.length - 100)
    },
    clearChat(state) {
      state.messages = [WELCOME]
    },
  },
})

export const { addMessage, clearChat } = aiSlice.actions
export default aiSlice.reducer
