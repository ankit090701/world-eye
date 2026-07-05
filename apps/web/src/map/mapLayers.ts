import type {
  Map as MlMap,
  LayerSpecification,
  GeoJSONSource,
} from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { SRC, LYR, PLANE_IMAGE, SHIP_IMAGE, TRAIN_IMAGE, VEHICLE_IMAGE, WIND_IMAGE } from './ids'
import type { LayerState } from '../types'
import { CATEGORY_COLORS } from '../data/activitySimulator'
import { buildGraticule } from '../lib/geo'
import { createPlaneImage } from './aircraft/planeIcon'
import { createShipImage } from './ships/shipIcon'
import { createTrainImage } from './trains/trainIcon'
import { createVehicleImage } from './fleet/vehicleIcon'
import { createWindArrowImage } from './weather/windArrowIcon'
import { SHIP_COLORS } from '../config/shipTypes'
import { TRAIN_COLORS } from '../config/trainTypes'
import { STATUS_COLORS } from '../config/fleetTypes'
import { CONGESTION_COLORS, INCIDENT_COLORS } from '../config/trafficTypes'

const congestionColorExpr: any = [
  'match',
  ['get', 'congestion'],
  'free', CONGESTION_COLORS.free,
  'moderate', CONGESTION_COLORS.moderate,
  'heavy', CONGESTION_COLORS.heavy,
  CONGESTION_COLORS.unknown,
]
const incidentColorExpr: any = [
  'match',
  ['get', 'itype'],
  'accident', INCIDENT_COLORS.accident,
  'closure', INCIDENT_COLORS.closure,
  'roadwork', INCIDENT_COLORS.roadwork,
  'restriction', INCIDENT_COLORS.restriction,
  INCIDENT_COLORS.other,
]

const fleetColorExpr: any = [
  'match',
  ['get', 'status'],
  'moving', STATUS_COLORS.moving,
  'idle', STATUS_COLORS.idle,
  'parked', STATUS_COLORS.parked,
  'offline', STATUS_COLORS.offline,
  STATUS_COLORS.parked,
]

const trainColorExpr: any = [
  'match',
  ['get', 'category'],
  'longdistance', TRAIN_COLORS.longdistance,
  'commuter', TRAIN_COLORS.commuter,
  'cargo', TRAIN_COLORS.cargo,
  TRAIN_COLORS.other,
]

// Colour ships by AIS category.
const shipColorExpr: any = [
  'match',
  ['get', 'category'],
  'cargo', SHIP_COLORS.cargo,
  'tanker', SHIP_COLORS.tanker,
  'passenger', SHIP_COLORS.passenger,
  'fishing', SHIP_COLORS.fishing,
  'tug', SHIP_COLORS.tug,
  'highspeed', SHIP_COLORS.highspeed,
  'military', SHIP_COLORS.military,
  'pleasure', SHIP_COLORS.pleasure,
  SHIP_COLORS.other,
]

// Colour ramp for aircraft by altitude (ft); emergencies override to red.
const altColorExpr: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'alt'], 0],
  0, '#22d3ee',
  8000, '#38bdf8',
  18000, '#34d399',
  28000, '#a78bfa',
  38000, '#f59e0b',
  45000, '#f43f5e',
]

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

function ensureGeoJSONSource(map: MlMap, id: string, data: FeatureCollection) {
  if (map.getSource(id)) return
  map.addSource(id, { type: 'geojson', data })
}

function addLayerSafe(map: MlMap, layer: LayerSpecification) {
  if (map.getLayer(layer.id)) return
  map.addLayer(layer)
}

// ---- Module 9: weather colour ramps ----
const tempColorExpr: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'temp'], 0],
  -30, '#4c1d95',
  -15, '#3b82f6',
  0, '#22d3ee',
  10, '#34d399',
  20, '#fde047',
  30, '#fb923c',
  40, '#ef4444',
  48, '#7f1d1d',
]
const cycloneColorExpr: any = [
  'match',
  ['get', 'category'],
  'td', '#38bdf8',
  'ts', '#22d3ee',
  'cat1', '#fde047',
  'cat2', '#fbbf24',
  'cat3', '#fb923c',
  'cat4', '#f43f5e',
  'cat5', '#c026d3',
  '#c084fc',
]
const alertSeverityColorExpr: any = [
  'match',
  ['get', 'severity'],
  'critical', '#f43f5e',
  'warning', '#f59e0b',
  'info', '#38bdf8',
  '#f43f5e',
]

const newsCategoryColorExpr: any = [
  'match',
  ['get', 'category'],
  'breaking', '#fbbf24',
  'disasters', '#f97316',
  'wars', '#f43f5e',
  'economic', '#22d3ee',
  'political', '#a78bfa',
  '#fbbf24',
]

const quakeDepthColorExpr: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'depth'], 0],
  0, '#ef4444',
  70, '#f59e0b',
  300, '#22d3ee',
  700, '#3b82f6',
]

// Colour domain-infrastructure nodes by their role in the domain (Module 8).
const infraRoleColorExpr: any = [
  'match',
  ['get', 'role'],
  'apex', '#a78bfa',
  'www', '#818cf8',
  'mail', '#f59e0b',
  'ns', '#38bdf8',
  'sub', '#c4b5fd',
  '#a78bfa',
]

const categoryColorExpr: any = [
  'match',
  ['get', 'category'],
  'signal', CATEGORY_COLORS.signal,
  'transit', CATEGORY_COLORS.transit,
  'event', CATEGORY_COLORS.event,
  'sensor', CATEGORY_COLORS.sensor,
  'alert', CATEGORY_COLORS.alert,
  '#22d3ee',
]

/**
 * (Re)install all WorldEye overlay sources + layers on top of the current base
 * style. Called on every `style.load` because setStyle() wipes custom layers.
 * Idempotent — guards against re-adding existing sources/layers.
 */
export function installOverlays(map: MlMap) {
  // ---- sources ----
  ensureGeoJSONSource(map, SRC.activity, EMPTY)
  ensureGeoJSONSource(map, SRC.graticule, buildGraticule(20) as FeatureCollection)
  ensureGeoJSONSource(map, SRC.draw, EMPTY)
  ensureGeoJSONSource(map, SRC.drawDraft, EMPTY)
  ensureGeoJSONSource(map, SRC.measure, EMPTY)
  ensureGeoJSONSource(map, SRC.aircraft, EMPTY)
  ensureGeoJSONSource(map, SRC.aircraftTrail, EMPTY)
  ensureGeoJSONSource(map, SRC.ships, EMPTY)
  ensureGeoJSONSource(map, SRC.shipsTrail, EMPTY)
  ensureGeoJSONSource(map, SRC.trains, EMPTY)
  ensureGeoJSONSource(map, SRC.trainsTrail, EMPTY)
  ensureGeoJSONSource(map, SRC.trainsRoute, EMPTY)
  ensureGeoJSONSource(map, SRC.trainsRouteStops, EMPTY)
  ensureGeoJSONSource(map, SRC.fleet, EMPTY)
  ensureGeoJSONSource(map, SRC.fleetTrail, EMPTY)
  ensureGeoJSONSource(map, SRC.geofences, EMPTY)
  ensureGeoJSONSource(map, SRC.trafficFlow, EMPTY)
  ensureGeoJSONSource(map, SRC.trafficIncidents, EMPTY)
  ensureGeoJSONSource(map, SRC.cyberThreats, EMPTY)
  ensureGeoJSONSource(map, SRC.domainInfra, EMPTY)
  ensureGeoJSONSource(map, SRC.domainInfraLinks, EMPTY)
  ensureGeoJSONSource(map, SRC.weatherGrid, EMPTY)
  ensureGeoJSONSource(map, SRC.cyclones, EMPTY)
  ensureGeoJSONSource(map, SRC.wildfires, EMPTY)
  ensureGeoJSONSource(map, SRC.earthquakes, EMPTY)
  ensureGeoJSONSource(map, SRC.satellites, EMPTY)
  ensureGeoJSONSource(map, SRC.satOrbit, EMPTY)
  ensureGeoJSONSource(map, SRC.news, EMPTY)
  ensureGeoJSONSource(map, SRC.social, EMPTY)
  ensureGeoJSONSource(map, SRC.alertZones, EMPTY)
  ensureGeoJSONSource(map, SRC.alertEvents, EMPTY)

  // icon images (wiped by setStyle, so re-add on each style load)
  if (!map.hasImage(PLANE_IMAGE)) {
    try {
      map.addImage(PLANE_IMAGE, createPlaneImage(), { pixelRatio: 2 })
    } catch {
      /* ignore if already present */
    }
  }
  if (!map.hasImage(SHIP_IMAGE)) {
    try {
      map.addImage(SHIP_IMAGE, createShipImage(), { pixelRatio: 2 })
    } catch {
      /* ignore if already present */
    }
  }
  if (!map.hasImage(TRAIN_IMAGE)) {
    try {
      map.addImage(TRAIN_IMAGE, createTrainImage(), { pixelRatio: 2 })
    } catch {
      /* ignore if already present */
    }
  }
  if (!map.hasImage(VEHICLE_IMAGE)) {
    try {
      map.addImage(VEHICLE_IMAGE, createVehicleImage(), { pixelRatio: 2 })
    } catch {
      /* ignore if already present */
    }
  }
  if (!map.hasImage(WIND_IMAGE)) {
    try {
      map.addImage(WIND_IMAGE, createWindArrowImage(), { pixelRatio: 2 })
    } catch {
      /* ignore if already present */
    }
  }

  // ---- graticule (reference grid), drawn under data ----
  addLayerSafe(map, {
    id: LYR.graticule,
    type: 'line',
    source: SRC.graticule,
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#64748b',
      'line-width': ['case', ['get', 'major'], 1.1, 0.4] as any,
      'line-opacity': 0.5,
    },
  })

  // ---- geofences (Module 5) — zones drawn beneath data ----
  addLayerSafe(map, {
    id: LYR.geofenceFill,
    type: 'fill',
    source: SRC.geofences,
    paint: {
      'fill-color': ['coalesce', ['get', 'color'], '#818cf8'] as any,
      'fill-opacity': ['match', ['get', 'gtype'], 'restricted', 0.16, 'zone', 0.05, 0.1] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.geofenceLine,
    type: 'line',
    source: SRC.geofences,
    paint: {
      'line-color': ['coalesce', ['get', 'color'], '#818cf8'] as any,
      'line-width': 1.5,
      'line-opacity': 0.7,
      'line-dasharray': [2, 1.5] as any,
    },
  })

  // ---- Module 6: traffic (congestion heatmap + flow points + incidents) ----
  addLayerSafe(map, {
    id: LYR.trafficHeatmap,
    type: 'heatmap',
    source: SRC.trafficFlow,
    paint: {
      'heatmap-weight': ['coalesce', ['get', 'cong'], 0.2] as any,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 10, 2] as any,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.3, 'rgba(34,197,94,0.35)',
        0.6, 'rgba(245,158,11,0.6)',
        1, 'rgba(239,68,68,0.85)',
      ] as any,
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 10, 30] as any,
      'heatmap-opacity': 0.7,
    },
  })
  addLayerSafe(map, {
    id: LYR.trafficFlow,
    type: 'circle',
    source: SRC.trafficFlow,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'volume'], 0], 0, 3, 3000, 7] as any,
      'circle-color': congestionColorExpr,
      'circle-opacity': 0.85,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': 'rgba(7,11,18,0.6)',
    },
  })
  addLayerSafe(map, {
    id: LYR.trafficIncidents,
    type: 'circle',
    source: SRC.trafficIncidents,
    paint: {
      'circle-radius': [
        'case',
        ['get', 'selected'], 11,
        ['match', ['get', 'severity'], 'high', 8, 'medium', 6, 4],
      ] as any,
      'circle-color': incidentColorExpr,
      'circle-opacity': 0.95,
      'circle-stroke-width': ['case', ['get', 'selected'], 2.5, 1.5] as any,
      'circle-stroke-color': ['case', ['get', 'selected'], '#22d3ee', 'rgba(255,255,255,0.85)'] as any,
    },
  })

  // ---- activity heatmap ----
  addLayerSafe(map, {
    id: LYR.heatmap,
    type: 'heatmap',
    source: SRC.activity,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.15, 1, 1] as any,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 9, 3] as any,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(34,211,238,0.5)',
        0.4, 'rgba(56,189,248,0.7)',
        0.6, 'rgba(167,139,250,0.8)',
        0.8, 'rgba(245,158,11,0.9)',
        1, 'rgba(244,63,94,0.95)',
      ] as any,
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 4, 18, 9, 40] as any,
      'heatmap-opacity': 0.85,
    },
  })

  // ---- activity points ----
  addLayerSafe(map, {
    id: LYR.points,
    type: 'circle',
    source: SRC.activity,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.2, 4, 4, 9, 8, 14, 12] as any,
      'circle-color': categoryColorExpr,
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.35)',
    },
  })

  // ---- committed drawings ----
  addLayerSafe(map, {
    id: LYR.drawFill,
    type: 'fill',
    source: SRC.draw,
    filter: ['==', ['geometry-type'], 'Polygon'] as any,
    paint: {
      'fill-color': ['coalesce', ['get', 'color'], '#818cf8'] as any,
      'fill-opacity': 0.16,
    },
  })
  addLayerSafe(map, {
    id: LYR.drawLine,
    type: 'line',
    source: SRC.draw,
    paint: {
      'line-color': ['coalesce', ['get', 'color'], '#818cf8'] as any,
      'line-width': 2.2,
    },
  })
  addLayerSafe(map, {
    id: LYR.drawPoint,
    type: 'circle',
    source: SRC.draw,
    filter: ['==', ['geometry-type'], 'Point'] as any,
    paint: {
      'circle-radius': 5,
      'circle-color': ['coalesce', ['get', 'color'], '#818cf8'] as any,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0e1524',
    },
  })

  // ---- draft (in-progress) drawing ----
  addLayerSafe(map, {
    id: LYR.draftFill,
    type: 'fill',
    source: SRC.drawDraft,
    filter: ['==', ['geometry-type'], 'Polygon'] as any,
    paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.12 },
  })
  addLayerSafe(map, {
    id: LYR.draftLine,
    type: 'line',
    source: SRC.drawDraft,
    paint: {
      'line-color': '#22d3ee',
      'line-width': 1.8,
      'line-dasharray': [2, 1.5] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.draftPoint,
    type: 'circle',
    source: SRC.drawDraft,
    filter: ['==', ['geometry-type'], 'Point'] as any,
    paint: {
      'circle-radius': 4,
      'circle-color': '#22d3ee',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0e1524',
    },
  })

  // ---- measurement ----
  addLayerSafe(map, {
    id: LYR.measureLine,
    type: 'line',
    source: SRC.measure,
    paint: {
      'line-color': '#22d3ee',
      'line-width': 2,
      'line-dasharray': [1.5, 1] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.measurePoint,
    type: 'circle',
    source: SRC.measure,
    filter: ['==', ['geometry-type'], 'Point'] as any,
    paint: {
      'circle-radius': 4,
      'circle-color': '#0e1524',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#22d3ee',
    },
  })

  // ---- Module 4: trains ----
  addLayerSafe(map, {
    id: LYR.trainsRouteLine,
    type: 'line',
    source: SRC.trainsRoute,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#34d399',
      'line-width': 3,
      'line-opacity': 0.55,
      'line-dasharray': [1.5, 1] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.trainsRouteStop,
    type: 'circle',
    source: SRC.trainsRouteStops,
    paint: {
      'circle-radius': 3.5,
      'circle-color': ['case', ['get', 'passed'], '#475569', '#34d399'] as any,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0e1524',
    },
  })
  addLayerSafe(map, {
    id: LYR.trainsTrail,
    type: 'line',
    source: SRC.trainsTrail,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-opacity': 0.7 },
  })
  addLayerSafe(map, {
    id: LYR.trainsHalo,
    type: 'circle',
    source: SRC.trains,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 13, ['get', 'delayed'], 8, 5] as any,
      'circle-color': ['case', ['get', 'delayed'], '#ef4444', trainColorExpr] as any,
      'circle-opacity': ['case', ['get', 'selected'], 0.85, 0.55] as any,
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0] as any,
      'circle-stroke-color': '#22d3ee',
    },
  })
  addLayerSafe(map, {
    id: LYR.trainsIcon,
    type: 'symbol',
    source: SRC.trains,
    layout: {
      'icon-image': TRAIN_IMAGE,
      'icon-rotate': ['coalesce', ['get', 'course'], 0] as any,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['case', ['get', 'selected'], 0.7, 0.48] as any,
    },
    paint: {
      'icon-opacity': ['case', ['get', 'stopped'], 0.6, 1] as any,
    },
  })

  // ---- Module 3: ships ----
  addLayerSafe(map, {
    id: LYR.shipsTrail,
    type: 'line',
    source: SRC.shipsTrail,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-opacity': 0.75 },
  })
  addLayerSafe(map, {
    id: LYR.shipsHalo,
    type: 'circle',
    source: SRC.ships,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 13, 5] as any,
      'circle-color': shipColorExpr,
      'circle-opacity': ['case', ['get', 'selected'], 0.85, 0.55] as any,
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0] as any,
      'circle-stroke-color': '#22d3ee',
    },
  })
  addLayerSafe(map, {
    id: LYR.shipsIcon,
    type: 'symbol',
    source: SRC.ships,
    layout: {
      'icon-image': SHIP_IMAGE,
      'icon-rotate': ['coalesce', ['get', 'course'], 0] as any,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['case', ['get', 'selected'], 0.7, 0.46] as any,
    },
    paint: {
      'icon-opacity': ['case', ['get', 'moored'], 0.6, 1] as any,
    },
  })

  // ---- Module 2: aircraft ----
  addLayerSafe(map, {
    id: LYR.aircraftTrail,
    type: 'line',
    source: SRC.aircraftTrail,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#22d3ee',
      'line-width': 2,
      'line-opacity': 0.8,
    },
  })
  addLayerSafe(map, {
    id: LYR.aircraftHalo,
    type: 'circle',
    source: SRC.aircraft,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 15, ['get', 'emergency'], 10, 6] as any,
      'circle-color': ['case', ['get', 'emergency'], '#f43f5e', altColorExpr] as any,
      'circle-opacity': ['case', ['get', 'emergency'], 0.9, 0.5] as any,
      'circle-stroke-width': ['case', ['get', 'selected'], 2, ['get', 'emergency'], 2, 0] as any,
      'circle-stroke-color': ['case', ['get', 'selected'], '#22d3ee', '#f43f5e'] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.aircraftIcon,
    type: 'symbol',
    source: SRC.aircraft,
    layout: {
      'icon-image': PLANE_IMAGE,
      'icon-rotate': ['coalesce', ['get', 'track'], 0] as any,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['case', ['get', 'selected'], 0.75, 0.52] as any,
    },
    paint: {
      'icon-opacity': ['case', ['get', 'onGround'], 0.55, 1] as any,
    },
  })

  // ---- Module 5: fleet vehicles (topmost) ----
  addLayerSafe(map, {
    id: LYR.fleetTrail,
    type: 'line',
    source: SRC.fleetTrail,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-opacity': 0.7 },
  })
  addLayerSafe(map, {
    id: LYR.fleetHalo,
    type: 'circle',
    source: SRC.fleet,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 14, 7] as any,
      'circle-color': fleetColorExpr,
      'circle-opacity': ['case', ['get', 'selected'], 0.85, 0.5] as any,
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0] as any,
      'circle-stroke-color': '#22d3ee',
    },
  })
  addLayerSafe(map, {
    id: LYR.fleetIcon,
    type: 'symbol',
    source: SRC.fleet,
    layout: {
      'icon-image': VEHICLE_IMAGE,
      'icon-rotate': ['coalesce', ['get', 'heading'], 0] as any,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['case', ['get', 'selected'], 0.7, 0.5] as any,
    },
    paint: {
      'icon-opacity': ['case', ['get', 'moving'], 1, 0.7] as any,
    },
  })

  // ---- Module 7: cyber threat overlay (malicious infrastructure) ----
  addLayerSafe(map, {
    id: LYR.cyberThreatsGlow,
    type: 'circle',
    source: SRC.cyberThreats,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 6, 18] as any,
      'circle-color': '#f43f5e',
      'circle-opacity': 0.14,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.cyberThreats,
    type: 'circle',
    source: SRC.cyberThreats,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 7, 4] as any,
      'circle-color': '#f43f5e',
      'circle-opacity': 0.95,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fca5a5',
    },
  })

  // ---- Module 8: domain infrastructure footprint (star links + nodes) ----
  addLayerSafe(map, {
    id: LYR.domainInfraLinks,
    type: 'line',
    source: SRC.domainInfraLinks,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#a78bfa',
      'line-width': 1,
      'line-opacity': 0.35,
      'line-dasharray': [2, 2] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.domainInfraGlow,
    type: 'circle',
    source: SRC.domainInfra,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 7, 6, 16] as any,
      'circle-color': infraRoleColorExpr,
      'circle-opacity': 0.16,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.domainInfra,
    type: 'circle',
    source: SRC.domainInfra,
    paint: {
      'circle-radius': ['case', ['==', ['get', 'role'], 'apex'], 7, 5] as any,
      'circle-color': infraRoleColorExpr,
      'circle-opacity': 0.95,
      'circle-stroke-width': ['case', ['==', ['get', 'role'], 'apex'], 2, 1] as any,
      'circle-stroke-color': '#ede9fe',
    },
  })

  // ---- Module 9: weather field (temperature / lightning / wind) ----
  addLayerSafe(map, {
    id: LYR.weatherTemp,
    type: 'circle',
    source: SRC.weatherGrid,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 3, 12, 6, 26] as any,
      'circle-color': tempColorExpr,
      'circle-opacity': 0.55,
      'circle-blur': 0.6,
    },
  })
  addLayerSafe(map, {
    id: LYR.weatherLightning,
    type: 'circle',
    source: SRC.weatherGrid,
    filter: ['==', ['get', 'lightning'], true] as any,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 6, 9] as any,
      'circle-color': '#fbbf24',
      'circle-opacity': 0.9,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#fef08a',
    },
  })
  addLayerSafe(map, {
    id: LYR.weatherWind,
    type: 'symbol',
    source: SRC.weatherGrid,
    layout: {
      visibility: 'none',
      'icon-image': WIND_IMAGE,
      // wind_direction is the direction wind blows FROM; add 180° to point downwind
      'icon-rotate': ['+', ['coalesce', ['get', 'windDir'], 0], 180] as any,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['coalesce', ['get', 'windSpeed'], 0], 0, 0.5, 60, 1.2] as any,
    },
    paint: { 'icon-opacity': 0.9 },
  })

  // ---- Module 9: wildfires (NASA EONET) ----
  addLayerSafe(map, {
    id: LYR.wildfiresGlow,
    type: 'circle',
    source: SRC.wildfires,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 0, 8, 20000, 16, 100000, 26] as any,
      'circle-color': '#f97316',
      'circle-opacity': 0.18,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.wildfires,
    type: 'circle',
    source: SRC.wildfires,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 0, 4, 1000, 6, 20000, 10, 100000, 14] as any,
      'circle-color': '#fb923c',
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fed7aa',
    },
  })

  // ---- Module 9: earthquakes (USGS) ----
  addLayerSafe(map, {
    id: LYR.earthquakesGlow,
    type: 'circle',
    source: SRC.earthquakes,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 2, 6, 6, 22, 8, 34] as any,
      'circle-color': '#facc15',
      'circle-opacity': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 3, 0, 5, 0.25] as any,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.earthquakes,
    type: 'circle',
    source: SRC.earthquakes,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 0, 2, 3, 5, 6, 12, 8, 20] as any,
      'circle-color': quakeDepthColorExpr,
      'circle-opacity': 0.85,
      'circle-stroke-width': ['case', ['get', 'tsunami'], 2, 0.6] as any,
      'circle-stroke-color': ['case', ['get', 'tsunami'], '#22d3ee', 'rgba(255,255,255,0.7)'] as any,
    },
  })

  // ---- Module 9: tropical cyclones (NHC), topmost ----
  addLayerSafe(map, {
    id: LYR.cyclonesGlow,
    type: 'circle',
    source: SRC.cyclones,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 26] as any,
      'circle-color': cycloneColorExpr,
      'circle-opacity': 0.16,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.cyclones,
    type: 'circle',
    source: SRC.cyclones,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 11, 7] as any,
      'circle-color': cycloneColorExpr,
      'circle-opacity': 0.95,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  // ---- Module 10: satellites (orbit track under points, groups, selected halo) ----
  addLayerSafe(map, {
    id: LYR.satOrbit,
    type: 'line',
    source: SRC.satOrbit,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#22d3ee',
      'line-width': 1.6,
      'line-opacity': 0.7,
      'line-dasharray': [2, 1.5] as any,
    },
  })
  // selected halo (any group) — only shows on the feature with selected == true
  addLayerSafe(map, {
    id: LYR.satSelected,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'selected'], true] as any,
    paint: {
      'circle-radius': 12,
      'circle-color': '#22d3ee',
      'circle-opacity': 0.14,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#22d3ee',
    },
  })
  addLayerSafe(map, {
    id: LYR.satDebris,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'group'], 'debris'] as any,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.6, 5, 3] as any,
      'circle-color': '#f87171',
      'circle-opacity': 0.8,
    },
  })
  addLayerSafe(map, {
    id: LYR.satStarlink,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'group'], 'starlink'] as any,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.8, 5, 3.2] as any,
      'circle-color': '#60a5fa',
      'circle-opacity': 0.85,
    },
  })
  addLayerSafe(map, {
    id: LYR.satLaunches,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'group'], 'launches'] as any,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 5, 3.6] as any,
      'circle-color': '#a3e635',
      'circle-opacity': 0.9,
      'circle-stroke-width': 0.5,
      'circle-stroke-color': 'rgba(7,11,18,0.6)',
    },
  })
  addLayerSafe(map, {
    id: LYR.satActive,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'group'], 'active'] as any,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 6, ['interpolate', ['linear'], ['zoom'], 0, 2.2, 5, 4]] as any,
      'circle-color': '#e2e8f0',
      'circle-opacity': 0.92,
      'circle-stroke-width': 0.6,
      'circle-stroke-color': 'rgba(7,11,18,0.7)',
    },
  })
  addLayerSafe(map, {
    id: LYR.satIss,
    type: 'circle',
    source: SRC.satellites,
    filter: ['==', ['get', 'group'], 'iss'] as any,
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 9, 6] as any,
      'circle-color': '#22d3ee',
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  // ---- Module 11: news hotspots (geoparsed headlines) ----
  addLayerSafe(map, {
    id: LYR.newsGlow,
    type: 'circle',
    source: SRC.news,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'count'], 1], 1, 10, 8, 26] as any,
      'circle-color': newsCategoryColorExpr,
      'circle-opacity': 0.16,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.newsPoints,
    type: 'circle',
    source: SRC.news,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'count'], 1], 1, 5, 4, 9, 8, 14] as any,
      'circle-color': newsCategoryColorExpr,
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.8)',
    },
  })

  // ---- Module 12: social buzz hotspots (geoparsed posts) ----
  addLayerSafe(map, {
    id: LYR.socialGlow,
    type: 'circle',
    source: SRC.social,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'count'], 1], 1, 10, 8, 26] as any,
      'circle-color': '#ec4899',
      'circle-opacity': 0.16,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.socialPoints,
    type: 'circle',
    source: SRC.social,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'count'], 1], 1, 5, 4, 9, 8, 14] as any,
      'circle-color': '#ec4899',
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.8)',
    },
  })

  // ---- Module 14: alert zones (geo-alert areas) + fired-alert markers ----
  addLayerSafe(map, {
    id: LYR.alertZoneFill,
    type: 'fill',
    source: SRC.alertZones,
    paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.08 },
  })
  addLayerSafe(map, {
    id: LYR.alertZoneLine,
    type: 'line',
    source: SRC.alertZones,
    paint: {
      'line-color': '#f59e0b',
      'line-width': 1.4,
      'line-opacity': 0.6,
      'line-dasharray': [2, 1.5] as any,
    },
  })
  addLayerSafe(map, {
    id: LYR.alertEventsGlow,
    type: 'circle',
    source: SRC.alertEvents,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 9, 6, 22] as any,
      'circle-color': alertSeverityColorExpr,
      'circle-opacity': 0.18,
      'circle-blur': 1,
    },
  })
  addLayerSafe(map, {
    id: LYR.alertEvents,
    type: 'circle',
    source: SRC.alertEvents,
    paint: {
      'circle-radius': 6,
      'circle-color': alertSeverityColorExpr,
      'circle-opacity': 0.95,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })
}

function setData(map: MlMap, sourceId: string, data: FeatureCollection) {
  const src = map.getSource(sourceId) as GeoJSONSource | undefined
  if (src) src.setData(data as any)
}

export const setActivityData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.activity, d)
export const setDrawData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.draw, d)
export const setDraftData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.drawDraft, d)
export const setMeasureData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.measure, d)
export const setAircraftData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.aircraft, d)
export const setAircraftTrailData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.aircraftTrail, d)
export const setShipData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.ships, d)
export const setShipTrailData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.shipsTrail, d)
export const setTrainData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.trains, d)
export const setTrainTrailData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.trainsTrail, d)
export const setTrainRouteData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.trainsRoute, d)
export const setTrainRouteStopsData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.trainsRouteStops, d)
export const setFleetData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.fleet, d)
export const setFleetTrailData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.fleetTrail, d)
export const setGeofenceData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.geofences, d)
export const setTrafficFlowData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.trafficFlow, d)
export const setTrafficIncidentData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.trafficIncidents, d)
export const setCyberThreatData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.cyberThreats, d)
export const setDomainInfraData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.domainInfra, d)
export const setDomainInfraLinkData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.domainInfraLinks, d)
export const setWeatherGridData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.weatherGrid, d)
export const setCycloneData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.cyclones, d)
export const setWildfireData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.wildfires, d)
export const setEarthquakeData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.earthquakes, d)
export const setSatelliteData = (map: MlMap, d: FeatureCollection) =>
  setData(map, SRC.satellites, d)
export const setSatOrbitData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.satOrbit, d)
export const setNewsData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.news, d)
export const setSocialData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.social, d)
export const setAlertZoneData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.alertZones, d)
export const setAlertEventData = (map: MlMap, d: FeatureCollection) => setData(map, SRC.alertEvents, d)

const vis = (b: boolean): 'visible' | 'none' => (b ? 'visible' : 'none')

function setLayoutVis(map: MlMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis(visible))
}
function setPaint(map: MlMap, layerId: string, prop: string, value: unknown) {
  if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value as any)
}

/** Apply the Layer Controls redux state to the actual map layers. */
export function applyLayerStates(map: MlMap, layers: LayerState[]) {
  for (const l of layers) {
    switch (l.id) {
      case 'activity-heatmap':
        setLayoutVis(map, LYR.heatmap, l.visible)
        setPaint(map, LYR.heatmap, 'heatmap-opacity', l.opacity)
        break
      case 'activity-points':
        setLayoutVis(map, LYR.points, l.visible)
        setPaint(map, LYR.points, 'circle-opacity', l.opacity * 0.9)
        setPaint(map, LYR.points, 'circle-stroke-opacity', l.opacity * 0.6)
        break
      case 'drawings':
        for (const id of [LYR.drawFill, LYR.drawLine, LYR.drawPoint]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.drawFill, 'fill-opacity', l.opacity * 0.16)
        setPaint(map, LYR.drawLine, 'line-opacity', l.opacity)
        setPaint(map, LYR.drawPoint, 'circle-opacity', l.opacity)
        break
      case 'graticule':
        setLayoutVis(map, LYR.graticule, l.visible)
        setPaint(map, LYR.graticule, 'line-opacity', l.opacity)
        break
      case 'aircraft':
        for (const id of [LYR.aircraftTrail, LYR.aircraftHalo, LYR.aircraftIcon]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.aircraftIcon, 'icon-opacity', l.opacity)
        break
      case 'ships':
        for (const id of [LYR.shipsTrail, LYR.shipsHalo, LYR.shipsIcon]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.shipsIcon, 'icon-opacity', l.opacity)
        break
      case 'trains':
        for (const id of [
          LYR.trainsRouteLine,
          LYR.trainsRouteStop,
          LYR.trainsTrail,
          LYR.trainsHalo,
          LYR.trainsIcon,
        ]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.trainsIcon, 'icon-opacity', l.opacity)
        break
      case 'fleet':
        for (const id of [LYR.fleetTrail, LYR.fleetHalo, LYR.fleetIcon]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.fleetIcon, 'icon-opacity', l.opacity)
        break
      case 'traffic-incidents':
        setLayoutVis(map, LYR.trafficIncidents, l.visible)
        setPaint(map, LYR.trafficIncidents, 'circle-opacity', l.opacity)
        break
      case 'traffic-flow':
        setLayoutVis(map, LYR.trafficHeatmap, l.visible)
        setLayoutVis(map, LYR.trafficFlow, l.visible)
        setPaint(map, LYR.trafficHeatmap, 'heatmap-opacity', l.opacity * 0.7)
        setPaint(map, LYR.trafficFlow, 'circle-opacity', l.opacity * 0.85)
        break
      case 'cyber-threats':
        setLayoutVis(map, LYR.cyberThreatsGlow, l.visible)
        setLayoutVis(map, LYR.cyberThreats, l.visible)
        setPaint(map, LYR.cyberThreats, 'circle-opacity', l.opacity * 0.95)
        break
      case 'domain-infra':
        for (const id of [LYR.domainInfraLinks, LYR.domainInfraGlow, LYR.domainInfra]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.domainInfra, 'circle-opacity', l.opacity * 0.95)
        setPaint(map, LYR.domainInfraLinks, 'line-opacity', l.opacity * 0.35)
        break
      case 'weather-temp':
        setLayoutVis(map, LYR.weatherTemp, l.visible)
        setPaint(map, LYR.weatherTemp, 'circle-opacity', l.opacity * 0.55)
        break
      case 'weather-wind':
        setLayoutVis(map, LYR.weatherWind, l.visible)
        setPaint(map, LYR.weatherWind, 'icon-opacity', l.opacity)
        break
      case 'weather-lightning':
        setLayoutVis(map, LYR.weatherLightning, l.visible)
        setPaint(map, LYR.weatherLightning, 'circle-opacity', l.opacity * 0.9)
        break
      case 'cyclones':
        setLayoutVis(map, LYR.cyclonesGlow, l.visible)
        setLayoutVis(map, LYR.cyclones, l.visible)
        setPaint(map, LYR.cyclones, 'circle-opacity', l.opacity * 0.95)
        break
      case 'wildfires':
        setLayoutVis(map, LYR.wildfiresGlow, l.visible)
        setLayoutVis(map, LYR.wildfires, l.visible)
        setPaint(map, LYR.wildfires, 'circle-opacity', l.opacity * 0.9)
        break
      case 'earthquakes':
        setLayoutVis(map, LYR.earthquakesGlow, l.visible)
        setLayoutVis(map, LYR.earthquakes, l.visible)
        setPaint(map, LYR.earthquakes, 'circle-opacity', l.opacity * 0.85)
        break
      case 'sat-iss':
        setLayoutVis(map, LYR.satIss, l.visible)
        setPaint(map, LYR.satIss, 'circle-opacity', l.opacity)
        break
      case 'sat-active':
        setLayoutVis(map, LYR.satActive, l.visible)
        setPaint(map, LYR.satActive, 'circle-opacity', l.opacity * 0.92)
        break
      case 'sat-starlink':
        setLayoutVis(map, LYR.satStarlink, l.visible)
        setPaint(map, LYR.satStarlink, 'circle-opacity', l.opacity * 0.85)
        break
      case 'sat-debris':
        setLayoutVis(map, LYR.satDebris, l.visible)
        setPaint(map, LYR.satDebris, 'circle-opacity', l.opacity * 0.8)
        break
      case 'sat-launches':
        setLayoutVis(map, LYR.satLaunches, l.visible)
        setPaint(map, LYR.satLaunches, 'circle-opacity', l.opacity * 0.9)
        break
      case 'sat-orbits':
        setLayoutVis(map, LYR.satOrbit, l.visible)
        setPaint(map, LYR.satOrbit, 'line-opacity', l.opacity * 0.7)
        break
      case 'news-hotspots':
        setLayoutVis(map, LYR.newsGlow, l.visible)
        setLayoutVis(map, LYR.newsPoints, l.visible)
        setPaint(map, LYR.newsPoints, 'circle-opacity', l.opacity * 0.9)
        break
      case 'social-buzz':
        setLayoutVis(map, LYR.socialGlow, l.visible)
        setLayoutVis(map, LYR.socialPoints, l.visible)
        setPaint(map, LYR.socialPoints, 'circle-opacity', l.opacity * 0.9)
        break
      case 'alert-zones':
        setLayoutVis(map, LYR.alertZoneFill, l.visible)
        setLayoutVis(map, LYR.alertZoneLine, l.visible)
        setPaint(map, LYR.alertZoneLine, 'line-opacity', l.opacity)
        break
      case 'alert-events':
        setLayoutVis(map, LYR.alertEventsGlow, l.visible)
        setLayoutVis(map, LYR.alertEvents, l.visible)
        setPaint(map, LYR.alertEvents, 'circle-opacity', l.opacity * 0.95)
        break
      case 'geofences': {
        for (const id of [LYR.geofenceFill, LYR.geofenceLine]) {
          setLayoutVis(map, id, l.visible)
        }
        setPaint(map, LYR.geofenceLine, 'line-opacity', l.opacity)
        // scale the per-type fill opacities by the slider (0.7 is the design default)
        const k = l.opacity / 0.7
        setPaint(map, LYR.geofenceFill, 'fill-opacity', [
          'match',
          ['get', 'gtype'],
          'restricted', 0.16 * k,
          'zone', 0.05 * k,
          0.1 * k,
        ])
        break
      }
    }
  }
}
