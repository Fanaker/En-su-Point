import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_STYLE, MAPBOX_TOKEN, pinDataUrl, homePinDataUrl } from "@/lib/mapbox";
import { LIMA_CENTER } from "@/lib/lima";

mapboxgl.accessToken = MAPBOX_TOKEN;

export interface MapboxPoint {
  id: string;
  title: string;
  district: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  avg_rating: number;
  total_reviews: number;
  category_slug?: string | null;
}

interface Props {
  points: MapboxPoint[];
  /** Si está activo, el usuario puede hacer click para colocar un pin */
  pickerMode?: boolean;
  pickerCategorySlug?: string | null;
  initialPicker?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  onSelect?: (point: MapboxPoint) => void;
  showUserLocation?: boolean;
  className?: string;
  /** Pin especial para "Mi Hogar" */
  homePin?: { lat: number; lng: number } | null;
}

export default function MapboxMap({
  points,
  pickerMode,
  pickerCategorySlug,
  initialPicker,
  onPick,
  onSelect,
  showUserLocation = true,
  className,
  homePin,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const pickerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const homeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [LIMA_CENTER[1], LIMA_CENTER[0]],
      zoom: 11.4,
      attributionControl: false,
      pitch: 30,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    if (showUserLocation) {
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
          showUserHeading: true,
        }),
        "bottom-right",
      );
    }
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picker click
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pickerMode) {
      map.getCanvas().style.cursor = "";
      return;
    }
    map.getCanvas().style.cursor = "crosshair";
    const handler = (e: mapboxgl.MapMouseEvent) => {
      onPick?.(e.lngLat.lat, e.lngLat.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
      map.getCanvas().style.cursor = "";
    };
  }, [pickerMode, onPick]);

  // Picker marker (movible)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickerMode) {
      pickerMarkerRef.current?.remove();
      pickerMarkerRef.current = null;
      return;
    }
    if (!initialPicker) return;
    const el = document.createElement("img");
    el.src = pinDataUrl(pickerCategorySlug);
    el.style.width = "44px";
    el.style.height = "55px";
    el.style.cursor = "grab";
    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLngLat([initialPicker.lng, initialPicker.lat]);
      // refresh icon when category changes
      const oldEl = pickerMarkerRef.current.getElement() as HTMLImageElement;
      oldEl.src = pinDataUrl(pickerCategorySlug);
    } else {
      const m = new mapboxgl.Marker({ element: el, draggable: true, anchor: "bottom" })
        .setLngLat([initialPicker.lng, initialPicker.lat])
        .addTo(map);
      m.on("dragend", () => {
        const ll = m.getLngLat();
        onPick?.(ll.lat, ll.lng);
      });
      pickerMarkerRef.current = m;
    }
  }, [initialPicker, pickerMode, pickerCategorySlug, onPick]);

  // Home pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!homePin) {
      homeMarkerRef.current?.remove();
      homeMarkerRef.current = null;
      return;
    }
    if (!homeMarkerRef.current) {
      const el = document.createElement("img");
      el.src = homePinDataUrl();
      el.style.width = "40px";
      el.style.height = "50px";
      el.title = "Mi Hogar";
      const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([homePin.lng, homePin.lat])
        .setPopup(new mapboxgl.Popup({ offset: 32, closeButton: false }).setHTML('<div style="padding:6px 10px;font-size:12px;font-weight:600;color:#F3F4F6;">🏠 Mi Hogar</div>'))
        .addTo(map);
      homeMarkerRef.current = m;
    } else {
      homeMarkerRef.current.setLngLat([homePin.lng, homePin.lat]);
    }
  }, [homePin]);

  // Render points as markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupRef.current?.remove();
    popupRef.current = null;

    points.forEach((p) => {
      const el = document.createElement("div");
      const pin = document.createElement("img");
      pin.src = pinDataUrl(p.category_slug);
      pin.alt = p.title;
      pin.style.width = "36px";
      pin.style.height = "45px";
      pin.style.transition = "transform 200ms ease";
      el.appendChild(pin);
      el.style.width = "36px";
      el.style.height = "45px";
      el.style.cursor = "pointer";

      const showPopup = () => {
        pin.style.transform = "scale(1.2)";
        popupRef.current?.remove();
        const html = renderMiniCard(p);
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 38,
          className: "ensupoint-popup",
          maxWidth: "240px",
        })
          .setLngLat([p.longitude, p.latitude])
          .setHTML(html)
          .addTo(map);
        const node = popup.getElement();
        if (node) {
          node.addEventListener("mouseleave", hidePopup);
          node.querySelector("[data-action='detail']")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelectRef.current?.(p);
          popup.remove();
        });
        }
        popupRef.current = popup;
      };
      const hidePopup = () => {
        pin.style.transform = "scale(1)";
        window.setTimeout(() => {
          const pop = popupRef.current?.getElement();
          if (pop && pop.matches(":hover")) return;
          popupRef.current?.remove();
          popupRef.current = null;
        }, 120);
      };

      el.addEventListener("mouseenter", showPopup);
      el.addEventListener("mouseleave", hidePopup);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        showPopup();
      });
      const m = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);
      markersRef.current.push(m);
    });

    if (points.length > 1 && !pickerMode) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [points, pickerMode]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

function renderMiniCard(p: MapboxPoint) {
  const stars = "★".repeat(Math.round(p.avg_rating)) + "☆".repeat(5 - Math.round(p.avg_rating));
  const img = p.image_url
    ? `<div style="height:80px;background:url('${escapeAttr(p.image_url)}') center/cover;"></div>`
    : `<div style="height:50px;background:linear-gradient(135deg, oklch(0.25 0.05 264), oklch(0.16 0.03 260));"></div>`;
  return `
    <div style="font-family: inherit; min-width: 200px;">
      ${img}
      <div style="padding:10px 12px;">
        <div style="font-weight:700; font-size:13px; line-height:1.2; color:#F3F4F6;">${escapeHtml(p.title)}</div>
        <div style="margin-top:2px; font-size:11px; color:#9CA3AF;">${escapeHtml(p.district)}</div>
        <div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <span style="color:#FBBF24; font-size:12px;">${stars} <span style="color:#9CA3AF; margin-left:4px;">${p.total_reviews}</span></span>
          <button data-action="detail" style="cursor:pointer; border:none; background:linear-gradient(135deg, oklch(0.55 0.21 264), oklch(0.7 0.18 280)); color:white; font-size:11px; font-weight:600; padding:5px 10px; border-radius:999px;">Ver detalle</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeAttr(s: string) { return s.replace(/"/g, "&quot;"); }