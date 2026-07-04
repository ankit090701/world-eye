import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { TimelineMode } from '../types'
import { HISTORY_WINDOW_MS } from '../data/activitySimulator'

interface TimelineState {
  mode: TimelineMode
  /** reference "now" (advances in live mode) */
  now: number
  rangeStart: number
  rangeEnd: number
  /** playhead position (epoch ms) */
  currentTime: number
  /** how many minutes of activity to reveal around the playhead */
  windowMinutes: number
  playing: boolean
  /** playback speed multiplier */
  speed: number
}

const now = Date.now()

const initialState: TimelineState = {
  mode: 'live',
  now,
  rangeStart: now - HISTORY_WINDOW_MS,
  rangeEnd: now,
  currentTime: now,
  windowMinutes: 180,
  playing: false,
  speed: 60,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<TimelineMode>) {
      state.mode = action.payload
      if (action.payload === 'live') {
        state.currentTime = state.rangeEnd
        state.playing = false
      }
    },
    setCurrentTime(state, action: PayloadAction<number>) {
      state.currentTime = clamp(action.payload, state.rangeStart, state.rangeEnd)
      // scrubbing implies historical review
      if (state.mode === 'live') state.mode = 'historical'
    },
    togglePlaying(state) {
      if (state.mode === 'live') state.mode = 'historical'
      state.playing = !state.playing
    },
    setPlaying(state, action: PayloadAction<boolean>) {
      state.playing = action.payload
    },
    setSpeed(state, action: PayloadAction<number>) {
      state.speed = action.payload
    },
    setWindowMinutes(state, action: PayloadAction<number>) {
      state.windowMinutes = clamp(action.payload, 5, 24 * 60)
    },
    /** advance playhead during historical playback; loops at the end */
    advancePlayback(state, action: PayloadAction<number>) {
      const next = state.currentTime + action.payload
      state.currentTime = next > state.rangeEnd ? state.rangeStart : next
    },
    /** live clock tick — rolls the 24h window forward */
    liveTick(state, action: PayloadAction<number>) {
      state.now = action.payload
      state.rangeEnd = action.payload
      state.rangeStart = action.payload - HISTORY_WINDOW_MS
      if (state.mode === 'live') state.currentTime = action.payload
    },
    jumpToNow(state) {
      state.mode = 'live'
      state.currentTime = state.rangeEnd
      state.playing = false
    },
  },
})

export const {
  setMode,
  setCurrentTime,
  togglePlaying,
  setPlaying,
  setSpeed,
  setWindowMinutes,
  advancePlayback,
  liveTick,
  jumpToNow,
} = timelineSlice.actions
export default timelineSlice.reducer
