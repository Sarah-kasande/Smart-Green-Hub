// Leaflet maps with OpenStreetMap tiles.
// Markers are drawn as circles (CircleMarker), so no marker image files are needed.
import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'

// Centre of Kigali
const KIGALI = [-1.9441, 30.0619]

// Leaflet measures its box once. When the page layout is still settling (cards, fonts, lazy loading)
// that size can be wrong and only part of the map gets tiles. Measuring again fixes it.
function FixSize() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

function Tiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  )
}

// points: [{ id, lat, lng, title, lines: [], action? }]
export function PointsMap({ points, height = 360, label }) {
  const located = points.filter((p) => p.lat !== null && p.lng !== null && p.lat !== undefined)
  const center = located.length ? [located[0].lat, located[0].lng] : KIGALI
  return (
    <div role="region" aria-label={label} style={{ height }} className="overflow-hidden rounded-2xl border border-line">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <Tiles />
        <FixSize />
        {located.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2E7D32', fillOpacity: 0.95 }}>
            <Popup>
              <strong>{p.title}</strong>
              {p.lines?.map((line) => (
                <div key={line}>{line}</div>
              ))}
              {p.action}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) })
    },
  })
  return null
}

// Tap the map to place the nursery pin (FR03)
export function LocationPicker({ value, onChange, height = 300, label }) {
  const center = value?.lat ? [value.lat, value.lng] : KIGALI
  return (
    <div role="region" aria-label={label} style={{ height }} className="overflow-hidden rounded-2xl border border-line">
      <MapContainer center={center} zoom={value?.lat ? 15 : 12} style={{ height: '100%', width: '100%' }}>
        <Tiles />
        <FixSize />
        <ClickToPick onPick={onChange} />
        {value?.lat && <CircleMarker center={[value.lat, value.lng]} radius={11} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2E7D32', fillOpacity: 1 }} />}
      </MapContainer>
    </div>
  )
}
