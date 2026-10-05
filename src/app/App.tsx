import { MapCanvas } from '@/features/map/ui/MapCanvas'
import { MapChrome } from '@/features/map/ui/MapChrome'

export function App() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <MapCanvas />
      <MapChrome />
    </div>
  )
}
