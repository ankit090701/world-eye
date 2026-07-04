import { useEffect } from 'react'
import type maplibregl from 'maplibre-gl'
import type { Feature } from 'geojson'
import { useMapContext } from '../MapContext'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { openPanel } from '../../store/uiSlice'
import { selectTrain, trainFeedError, trainFeedOk } from '../../store/trainSlice'
import { trainStore, useTrainSnapshot } from '../../data/trainStore'
import { fetchTrains } from '../../api/trainsApi'
import type { BBox } from '../../api/shipsApi'
import {
  setTrainData,
  setTrainRouteData,
  setTrainRouteStopsData,
  setTrainTrailData,
} from '../mapLayers'
import { LYR } from '../ids'

function useTrainsEnabled(): boolean {
  return useAppSelector((s) => s.layers.items.find((l) => l.id === 'trains')?.visible ?? false)
}

function viewportBBox(map: maplibregl.Map): BBox {
  const b = map.getBounds()
  let minLon = b.getWest()
  let maxLon = b.getEast()
  let minLat = Math.max(-85, b.getSouth())
  let maxLat = Math.min(85, b.getNorth())
  if (minLon < -180 || maxLon > 180 || maxLon - minLon > 340 || minLon > maxLon) {
    minLon = -180
    maxLon = 180
  }
  if (minLat > maxLat) {
    minLat = -85
    maxLat = 85
  }
  return { minLon, minLat, maxLon, maxLat }
}

export function TrainEngine() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const enabled = useTrainsEnabled()

  useEffect(() => {
    if (!map || !enabled) return
    let cancelled = false
    let inFlight = false
    let moveTimer = 0

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const resp = await fetchTrains(viewportBBox(map))
        if (cancelled) return
        trainStore.update(resp)
        dispatch(trainFeedOk({ source: resp.source, count: resp.count, lastUpdated: Date.now() }))
      } catch {
        if (!cancelled) dispatch(trainFeedError('Train feed unavailable — is the WorldEye API running?'))
      } finally {
        inFlight = false
      }
    }

    poll()
    const id = window.setInterval(poll, 12000)
    const onMoveEnd = (e: maplibregl.MapLibreEvent & { originalEvent?: unknown }) => {
      if (!e.originalEvent) return
      window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(poll, 1200)
    }
    map.on('moveend', onMoveEnd)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearTimeout(moveTimer)
      map.off('moveend', onMoveEnd)
    }
  }, [map, enabled, dispatch])

  return null
}

export function TrainSync() {
  const { map } = useMapContext()
  const epoch = useAppSelector((s) => s.map.styleEpoch)
  const snap = useTrainSnapshot()
  const selectedId = useAppSelector((s) => s.train.selectedId)
  const categoryFilter = useAppSelector((s) => s.train.categoryFilter)
  const follow = useAppSelector((s) => s.train.follow)
  const route = useAppSelector((s) => s.train.selectedRoute)

  useEffect(() => {
    if (!map || epoch === 0) return
    const list = categoryFilter
      ? snap.trains.filter((t) => categoryFilter.includes(t.category))
      : snap.trains
    const features: Feature[] = list.map((t) => ({
      type: 'Feature',
      properties: {
        id: t.id,
        category: t.category,
        course: trainStore.headingFor(t.id),
        delayed: t.delayMin != null && t.delayMin >= 5,
        stopped: t.speed != null && t.speed < 1,
        selected: t.id === selectedId,
      },
      geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
    }))
    setTrainData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedId, categoryFilter])

  // observed trail of selected
  useEffect(() => {
    if (!map || epoch === 0) return
    const trail = trainStore.trailFor(selectedId)
    const features: Feature[] =
      trail.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } }]
        : []
    setTrainTrailData(map, { type: 'FeatureCollection', features })
  }, [map, epoch, snap, selectedId])

  // scheduled route + stops of selected
  useEffect(() => {
    if (!map || epoch === 0) return
    const coords = (route?.stops ?? [])
      .filter((s) => s.lat != null && s.lon != null)
      .map((s) => [s.lon as number, s.lat as number])
    const line: Feature[] =
      coords.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }]
        : []
    setTrainRouteData(map, { type: 'FeatureCollection', features: line })

    const stops: Feature[] = (route?.stops ?? [])
      .filter((s) => s.commercial && s.lat != null && s.lon != null)
      .map((s) => ({
        type: 'Feature',
        properties: { passed: s.passed, name: s.name },
        geometry: { type: 'Point', coordinates: [s.lon as number, s.lat as number] },
      }))
    setTrainRouteStopsData(map, { type: 'FeatureCollection', features: stops })
  }, [map, epoch, route])

  // follow
  useEffect(() => {
    if (!map || !follow || !selectedId) return
    const t = snap.byId[selectedId]
    if (t) map.easeTo({ center: [t.lon, t.lat], duration: 900 })
  }, [map, follow, selectedId, snap])

  return null
}

export function TrainInteractions() {
  const { map } = useMapContext()
  const dispatch = useAppDispatch()
  const activeTool = useAppSelector((s) => s.ui.activeTool)

  useEffect(() => {
    if (!map || activeTool !== 'none') return
    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id
      if (id != null) {
        dispatch(selectTrain(String(id)))
        dispatch(openPanel('trains'))
      }
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ''
    }
    for (const layer of [LYR.trainsIcon, LYR.trainsHalo]) {
      map.on('click', layer, onClick)
      map.on('mouseenter', layer, onEnter)
      map.on('mouseleave', layer, onLeave)
    }
    return () => {
      for (const layer of [LYR.trainsIcon, LYR.trainsHalo]) {
        map.off('click', layer, onClick)
        map.off('mouseenter', layer, onEnter)
        map.off('mouseleave', layer, onLeave)
      }
    }
  }, [map, activeTool, dispatch])

  return null
}
