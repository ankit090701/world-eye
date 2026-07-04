import { useAppSelector } from '../store/hooks'
import LayersPanel from './panels/LayersPanel'
import SearchPanel from './panels/SearchPanel'
import BookmarksPanel from './panels/BookmarksPanel'
import InfoPanel from './panels/InfoPanel'
import AircraftPanel from './panels/AircraftPanel'
import ShipPanel from './panels/ShipPanel'
import TrainPanel from './panels/TrainPanel'
import FleetPanel from './panels/FleetPanel'
import TrafficPanel from './panels/TrafficPanel'

export default function PanelHost() {
  const panel = useAppSelector((s) => s.ui.activePanel)
  if (!panel) return null
  return (
    <div className="pointer-events-auto absolute bottom-24 left-16 top-16 z-20 animate-fade-in">
      {panel === 'layers' && <LayersPanel />}
      {panel === 'aircraft' && <AircraftPanel />}
      {panel === 'ships' && <ShipPanel />}
      {panel === 'trains' && <TrainPanel />}
      {panel === 'fleet' && <FleetPanel />}
      {panel === 'traffic' && <TrafficPanel />}
      {panel === 'search' && <SearchPanel />}
      {panel === 'bookmarks' && <BookmarksPanel />}
      {panel === 'info' && <InfoPanel />}
    </div>
  )
}
