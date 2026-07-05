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
import CyberPanel from './panels/CyberPanel'
import DomainPanel from './panels/DomainPanel'
import WeatherPanel from './panels/WeatherPanel'
import SatellitePanel from './panels/SatellitePanel'
import NewsPanel from './panels/NewsPanel'
import SocialPanel from './panels/SocialPanel'
import OsintPanel from './panels/OsintPanel'
import AlertsPanel from './panels/AlertsPanel'
import AiPanel from './panels/AiPanel'
import AnalyticsPanel from './panels/AnalyticsPanel'
import ReportsPanel from './panels/ReportsPanel'
import AdminPanel from './panels/AdminPanel'

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
      {panel === 'cyber' && <CyberPanel />}
      {panel === 'domain' && <DomainPanel />}
      {panel === 'weather' && <WeatherPanel />}
      {panel === 'satellites' && <SatellitePanel />}
      {panel === 'news' && <NewsPanel />}
      {panel === 'social' && <SocialPanel />}
      {panel === 'osint' && <OsintPanel />}
      {panel === 'alerts' && <AlertsPanel />}
      {panel === 'ai' && <AiPanel />}
      {panel === 'analytics' && <AnalyticsPanel />}
      {panel === 'reports' && <ReportsPanel />}
      {panel === 'admin' && <AdminPanel />}
      {panel === 'search' && <SearchPanel />}
      {panel === 'bookmarks' && <BookmarksPanel />}
      {panel === 'info' && <InfoPanel />}
    </div>
  )
}
