import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NewsArticle, NewsCategory, TrendingTopic } from '../types'

interface NewsState {
  category: NewsCategory
  articles: NewsArticle[]
  source: 'live' | 'sim' | null
  loading: boolean
  error: string | null
  trending: TrendingTopic[]
}

const initialState: NewsState = {
  category: 'breaking',
  articles: [],
  source: null,
  loading: false,
  error: null,
  trending: [],
}

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setCategory(state, action: PayloadAction<NewsCategory>) {
      state.category = action.payload
    },
    feedStart(state) {
      state.loading = true
      state.error = null
    },
    feedOk(state, action: PayloadAction<{ articles: NewsArticle[]; source: 'live' | 'sim' }>) {
      state.loading = false
      state.articles = action.payload.articles
      state.source = action.payload.source
      state.error = null
    },
    feedError(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
    },
    trendingOk(state, action: PayloadAction<TrendingTopic[]>) {
      state.trending = action.payload
    },
  },
})

export const { setCategory, feedStart, feedOk, feedError, trendingOk } = newsSlice.actions
export default newsSlice.reducer
