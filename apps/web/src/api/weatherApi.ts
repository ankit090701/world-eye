import { API_BASE } from '../config/api'
import type { CurrentConditions, WeatherEventsResponse, WeatherGridResponse } from '../types'

async function getJSON<T>(path: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal })
    if (!res.ok) {
      const msg = await res.json().then((b) => b?.error).catch(() => null)
      throw new Error(msg || `HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    window.clearTimeout(t)
  }
}

export function fetchWeatherCurrent(lat: number, lon: number): Promise<CurrentConditions> {
  return getJSON<CurrentConditions>(`/api/weather/current?lat=${lat}&lon=${lon}`, 12000)
}

export function fetchWeatherGrid(): Promise<WeatherGridResponse> {
  return getJSON<WeatherGridResponse>('/api/weather/grid', 14000)
}

export function fetchWeatherEvents(): Promise<WeatherEventsResponse> {
  return getJSON<WeatherEventsResponse>('/api/weather/events', 14000)
}
