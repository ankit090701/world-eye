import { MapProvider } from './map/MapContext'
import MapView from './map/MapView'
import TopBar from './components/TopBar'
import LeftDock from './components/LeftDock'
import RightToolbar from './components/RightToolbar'
import PanelHost from './components/PanelHost'
import TimelineBar from './components/TimelineBar'
import StatusBar from './components/StatusBar'
import Toast from './components/Toast'

export default function App() {
  return (
    <MapProvider>
      <div className="relative h-full w-full overflow-hidden bg-we-bg">
        <MapView />
        <TopBar />
        <LeftDock />
        <RightToolbar />
        <PanelHost />
        <TimelineBar />
        <StatusBar />
        <Toast />
      </div>
    </MapProvider>
  )
}
