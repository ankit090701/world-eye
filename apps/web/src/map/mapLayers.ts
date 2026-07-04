import type {
  Map as MlMap,
  LayerSpecification,
  GeoJSONSource,
} from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { SRC, LYR, PLANE_IMAGE, SHIP_IMAGE, TRAIN_IMAGE, VEHICLE_IMAGE } from './ids'
import type { LayerState } from '../types'
import { CATEGORY_COLORS } from '../data/activitySimulator'
import { buildGraticule } from '../lib/geo'
import { createPlaneImage } from './aircraft/planeIcon'
import { createShipImage } from './ships/shipIcon'
import { createTrainImage } from './trains/trainIcon'
import { createVehicleImage } from './fleet/vehicleIcon'
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
