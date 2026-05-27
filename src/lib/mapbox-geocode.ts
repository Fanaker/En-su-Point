import { MAPBOX_TOKEN } from "./mapbox";
import { LIMA_CENTER } from "./lima";

export interface GeocodeResult {
  id: string;
  placeName: string;       // texto bonito completo
  address: string;         // calle/lugar
  district: string | null; // distrito si está disponible
  longitude: number;
  latitude: number;
}

/** Busca direcciones/lugares cerca de Lima usando Mapbox Geocoding API */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&country=PE&language=es&limit=6&autocomplete=true` +
    `&proximity=${LIMA_CENTER[1]},${LIMA_CENTER[0]}` +
    `&types=address,poi,place,locality,neighborhood`;
  const r = await fetch(url, { signal });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.features ?? []).map((f: any): GeocodeResult => {
    const ctx: any[] = f.context ?? [];
    const district =
      ctx.find((c) => c.id?.startsWith("locality"))?.text ??
      ctx.find((c) => c.id?.startsWith("neighborhood"))?.text ??
      ctx.find((c) => c.id?.startsWith("place"))?.text ??
      null;
    return {
      id: f.id,
      placeName: f.place_name,
      address: f.text + (f.address ? ` ${f.address}` : ""),
      district,
      longitude: f.center[0],
      latitude: f.center[1],
    };
  });
}