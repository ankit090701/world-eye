import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useMapContext } from './MapContext'
import { store } from '../store'
import { useAppDispatch } from '../store/hooks'
import { bumpStyleEpoch, setCursor, setView } from '../store/mapSlice'
import { getBasemapStyle } from '../config/basemaps'
import { installOverlays } from './mapLayers'
import {
  ActivityInteractions,
  ActivitySync,
  BasemapSync,
  DrawSync,
  LayerVisibilitySync,
  ProjectionSync,
  TimelineEngine,
} from './Syncers'
import MeasureTool from './tools/MeasureTool'
import DrawTool from './tools/DrawTool'
import { AircraftEngine, AircraftSync, AircraftInteractions } from './aircraft/AircraftLayer'
import { ShipEngine, ShipSync, ShipInteractions } from './ships/ShipLayer'
import { TrainEngine, TrainSync, TrainInteractions } from './trains/TrainLayer'
import { FleetEngine, FleetSync, FleetInteractions } from './fleet/FleetLayer'
import { TrafficEngine, TrafficSync, TrafficInteractions } from './traffic/TrafficLayer'
import { WeatherOverlaySync } from './aircraft/WeatherOverlaySync'

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setMap, setReady } = useMapContext()
  const dispatch = useAppDispatch()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const initialState = store.getState().map
    const view = initialState.view

    const map = new maplibregl.Map({
      container,
      style: getBasemapStyle(initialState.basemap) as any,
      center: [view.lng, view.lat],
      zoom: view.zoom,
      pitch: view.pitch,
      bearing: view.bearing,
      attributionControl: { compact: true },
      // preserveDrawingBuffer is required so the WebGL canvas can be exported to PNG
      canvasContextAttributes: { preserveDrawingBuffer: true },
      maxPitch: 85,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')

    // Re-installs WorldEye overlays every time a style (re)loads (initial + setStyle).
    const onStyleLoad = () => {
      installOverlays(map)
      dispatch(bumpStyleEpoch())
    }
    map.on('style.load', onStyleLoad)
    map.on('load', () => setReady(true))

    // Cursor read-out (lightly throttled).
    let lastMove = 0
    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const now = performance.now()
      if (now - lastMove < 40) return
      lastMove = now
      dispatch(setCursor({ lng: e.lngLat.lng, lat: e.lngLat.lat }))
    }
    const onMouseOut = () => dispatch(setCursor(null))
    const onMoveEnd = () => {
      const c = map.getCenter()
      dispatch(
        setView({
          lng: c.lng,
          lat: c.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        }),
      )
    }
    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)
    map.on('moveend', onMoveEnd)

    setMap(map)

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(container)

    return () => {
      ro.disconnect()
      map.remove()
      setMap(null)
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {/* headless syncers keep the map in step with Redux + data stores */}
      <BasemapSync />
      <ProjectionSync />
      <LayerVisibilitySync />
      <ActivitySync />
      <DrawSync />
      <TimelineEngine />
      <ActivityInteractions />
      {/* Module 2: aircraft tracking */}
      <AircraftEngine />
      <AircraftSync />
      <AircraftInteractions />
      <WeatherOverlaySync />
      {/* Module 3: ship tracking */}
      <ShipEngine />
      <ShipSync />
      <ShipInteractions />
      {/* Module 4: train tracking */}
      <TrainEngine />
      <TrainSync />
      <TrainInteractions />
      {/* Module 5: fleet tracking */}
      <FleetEngine />
      <FleetSync />
      <FleetInteractions />
      {/* Module 6: traffic intelligence */}
      <TrafficEngine />
      <TrafficSync />
      <TrafficInteractions />
      {/* interactive map tools (render HUD when active) */}
      <MeasureTool />
      <DrawTool />
    </div>
  )
}
