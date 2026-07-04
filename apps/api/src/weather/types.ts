// Weather Intelligence (Module 9) — radar, temperature/wind/cloud/lightning grid,
// tropical cyclones, wildfires and earthquakes. All sources free & keyless
// (Open-Meteo · RainViewer · NOAA NHC · NASA EONET · USGS).

export interface CurrentConditions {
  lat: number
  lon: number
  time: string | null
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  precipitation: number | null
  weatherCode: number | null
  weatherText: string
  cloudCover: number | null
  windSpeed: number | null
  windDir: number | null
  windGusts: number | null
  cape: number | null
  isDay: boolean
}

export interface GridPoint {
  lat: number
  lon: number
  temp: number | null
  windSpeed: number | null
  windDir: number | null
  cloud: number | null
  cape: number | null
  code: number | null
  lightning: boolean
}

export interface WeatherGridResponse {
  source: 'live' | 'sim'
  now: number
  count: number
  points: GridPoint[]
}

export type CycloneCategory = 'td' | 'ts' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5'

export interface Cyclone {
  id: string
  name: string
  basin: string | null
  classification: string // TD / TS / HU …
  category: CycloneCategory
  lat: number
  lon: number
  windKt: number | null
  pressureMb: number | null
  movementDir: number | null
  movementSpeedKt: number | null
  lastUpdate: string | null
  source: 'live' | 'sim'
}

export interface Wildfire {
  id: string
  title: string
  lat: number
  lon: number
  date: string | null
  magnitude: number | null
  magnitudeUnit: string | null
}

export interface Earthquake {
  id: string
  mag: number | null
  place: string | null
  lat: number
  lon: number
  depthKm: number | null
  time: number | null
  tsunami: boolean
  url: string | null
}

export interface WeatherEventsResponse {
  now: number
  cyclones: Cyclone[]
  wildfires: Wildfire[]
  earthquakes: Earthquake[]
  cycloneSource: 'live' | 'sim'
}
