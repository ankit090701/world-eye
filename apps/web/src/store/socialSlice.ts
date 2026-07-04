import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { SocialPost, SocialSource } from '../types'

interface SocialState {
  source: SocialSource
  posts: SocialPost[]
  origin: 'live' | 'sim' | null
  loading: boolean
  error: string | null
}

const initialState: SocialState = {
  source: 'reddit',
  posts: [],
  origin: null,
  loading: false,
  error: null,
}

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setSource(state, action: PayloadAction<SocialSource>) {
      state.source = action.payload
    },
    feedStart(state) {
      state.loading = true
      state.error = null
    },
    feedOk(state, action: PayloadAction<{ posts: SocialPost[]; origin: 'live' | 'sim' }>) {
      state.loading = false
      state.posts = action.payload.posts
      state.origin = action.payload.origin
      state.error = null
    },
    feedError(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    },
  },
})

export const { setSource, feedStart, feedOk, feedError } = socialSlice.actions
export default socialSlice.reducer
