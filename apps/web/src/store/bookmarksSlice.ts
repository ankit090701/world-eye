import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Bookmark } from '../types'

const STORAGE_KEY = 'worldeye.bookmarks.v1'

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Bookmark[]) : []
  } catch {
    return []
  }
}

export function persistBookmarks(items: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* storage may be unavailable (private mode); ignore */
  }
}

interface BookmarksState {
  items: Bookmark[]
}

const initialState: BookmarksState = {
  items: loadBookmarks(),
}

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    addBookmark(state, action: PayloadAction<Bookmark>) {
      state.items.unshift(action.payload)
    },
    removeBookmark(state, action: PayloadAction<string>) {
      state.items = state.items.filter((b) => b.id !== action.payload)
    },
    renameBookmark(state, action: PayloadAction<{ id: string; name: string }>) {
      const b = state.items.find((x) => x.id === action.payload.id)
      if (b) b.name = action.payload.name
    },
  },
})

export const { addBookmark, removeBookmark, renameBookmark } = bookmarksSlice.actions
export default bookmarksSlice.reducer
