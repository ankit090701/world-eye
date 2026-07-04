import type { StyleSpecification } from 'maplibre-gl'
import type { BasemapId } from '../types'

// All basemaps below are FREE and require NO API key.
//  - CARTO GL styles (dark-matter / positron / voyager): free, keyless vector basemaps.
//  - OpenFreeMap "liberty": free (MIT), keyless vector tiles from OpenStreetMap data.
//  - Esri World Imagery: free keyless raster imagery (attribution required).

export interface BasemapDef {
  id: BasemapId
  label: string
  kind: 'vector' | 'raster'
  /** A style URL, or an inline style spec for raster sources. */
  style: string | StyleSpecification
  /** true => dark chrome pairs well with it */
  dark: boolean
}

const esriImagery: StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0b0f16' } },
    { id: 'esri-world-imagery', type: 'raster', source: 'esri-world-imagery' },
  ],
}

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  dark: {
    id: 'dark',
    label: 'Dark Matter',
    kind: 'vector',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    dark: true,
  },
  light: {
    id: 'light',
    label: 'Positron',
    kind: 'vector',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: false,
  },
  voyager: {
    id: 'voyager',
    label: 'Voyager',
    kind: 'vector',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    dark: false,
  },
  liberty: {
    id: 'liberty',
    label: 'Liberty (OSM)',
    kind: 'vector',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    dark: false,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    kind: 'raster',
    style: esriImagery,
    dark: true,
  },
}

export const BASEMAP_ORDER: BasemapId[] = ['dark', 'satellite', 'voyager', 'light', 'liberty']

export function getBasemapStyle(id: BasemapId): string | StyleSpecification {
  return BASEMAPS[id].style
}
