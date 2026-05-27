import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import { LIMA_CENTER } from "@/lib/lima";
import { RatingStars } from "@/components/points/RatingStars";

// Custom premium pin
const pinIcon = L.divIcon({
  className: "esp-pin",
  html: `<div style="position:relative;width:30px;height:38px">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 35%, oklch(0.7 0.2 260) 0%, oklch(0.45 0.16 12) 100%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 18px oklch(0.55 0.21 264 / 0.7)"></div>
    <div style="position:absolute;top:9px;left:9px;width:12px;height:12px;border-radius:50%;background:#0B1020;border:2px solid white"></div>
  </div>`,
  iconSize: [30, 38],
  iconAnchor: [15, 36],
  popupAnchor: [0, -32],
});

export interface MapPoint {
  id: string;
  title: string;
  district: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  avg_rating: number;
  total_reviews: number;
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }, [points, map]);
  return null;
}

export default function PointsMap({ points }: { points: MapPoint[] }) {
  return (
    <MapContainer
      center={LIMA_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "oklch(0.09 0.025 260)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon}>
          <Popup className="esp-popup">
            <div className="w-56">
              {p.image_url && (
                <img src={p.image_url} alt={p.title} className="mb-2 h-28 w-full rounded-lg object-cover" />
              )}
              <div className="font-semibold text-foreground">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.district}</div>
              <div className="mt-1 flex items-center justify-between">
                <RatingStars value={Number(p.avg_rating) || 0} size={12} />
                <Link to="/point/$id" params={{ id: p.id }} className="text-xs font-medium text-primary hover:underline">
                  Ver más →
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}