export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

/** Estilo nocturno con tonos azules en lugar de gris plano */
export const MAPBOX_STYLE = "mapbox://styles/mapbox/navigation-night-v1";

/** Mapping de slug de categoría -> icono lucide + color burgundy/blue */
export const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  restaurante:       { icon: "utensils",      color: "burgundy" },
  karaoke:           { icon: "mic",           color: "primary" },
  hotel:             { icon: "hotel",         color: "primary" },
  entretenimiento:   { icon: "party-popper",  color: "burgundy" },
  cafe:              { icon: "coffee",        color: "amber" },
  bar:               { icon: "beer",          color: "burgundy" },
  rooftop:           { icon: "building",      color: "primary" },
  "comida-rapida":   { icon: "pizza",         color: "burgundy" },
  "centro-comercial":{ icon: "shopping-bag",  color: "primary" },
  "lugar-oculto":    { icon: "sparkles",      color: "burgundy" },
  "spot-de-fotos":   { icon: "camera",        color: "amber" },
  "polleria":        { icon: "drumstick",     color: "burgundy" },
  "buffet":          { icon: "salad",         color: "amber" },
  otro:              { icon: "map-pin",       color: "primary" },
};

export function categoryColor(slug?: string | null): string {
  const c = (slug && CATEGORY_ICONS[slug]?.color) || "primary";
  if (c === "burgundy") return "oklch(0.5 0.18 12)";
  if (c === "amber") return "oklch(0.7 0.16 75)";
  return "oklch(0.55 0.21 264)";
}

/** SVG paths (mini lucide) usados para los pines en Mapbox */
export const CATEGORY_SVG: Record<string, string> = {
  utensils:       '<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 11v11M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  mic:            '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>',
  hotel:          '<path d="M3 22V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v18z"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  "party-popper": '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/>',
  coffee:         '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
  beer:           '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5C9.44 3.5 10 3 12 3s2.56.5 4 .5c.78 0 1.5-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5z"/><path d="M5 8v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/>',
  building:       '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  pizza:          '<path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>',
  "shopping-bag": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  sparkles:       '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  camera:         '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  "map-pin":      '<path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  "drumstick":    '<path d="M15.4 15.6c-.7.7-1.6 1.1-2.6 1.1-2.1 0-3.8-1.7-3.8-3.8 0-1 .4-1.9 1.1-2.6L15.4 4c1.5-1.5 4-1.5 5.6 0 1.5 1.5 1.5 4 0 5.6l-5.6 6z"/><path d="m9 14-5 5"/><path d="M7 17h2v2"/>',
  "salad":        '<path d="M7 21h10"/><path d="M5 21a8 8 0 1 1 14 0"/><path d="M12 13V3"/><path d="M9 6 12 3l3 3"/>',
};

/** Genera un marker SVG completo (pin + icono dentro) para Mapbox */
export function buildPinSvg(slug?: string | null): string {
  const meta = CATEGORY_ICONS[slug || "otro"] || CATEGORY_ICONS.otro;
  const color = categoryColor(slug);
  const svgIcon = CATEGORY_SVG[meta.icon] || CATEGORY_SVG["map-pin"];
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
  <defs>
    <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#g)">
    <path d="M20 2 C10 2 4 9 4 18 C4 28 20 48 20 48 C20 48 36 28 36 18 C36 9 30 2 20 2 Z"
          fill="${color}" stroke="#0B1020" stroke-width="2"/>
    <circle cx="20" cy="18" r="10" fill="#0B1020" opacity="0.85"/>
    <g transform="translate(11.5 9.5) scale(0.71)" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${svgIcon}
    </g>
  </g>
</svg>`.trim();
}

export function pinDataUrl(slug?: string | null): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(buildPinSvg(slug))}`;
}

/** Pin distintivo para "Mi Hogar" */
export function buildHomePinSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="55" viewBox="0 0 40 50">
  <defs>
    <filter id="hg" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="hgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="oklch(0.7 0.18 280)"/>
      <stop offset="100%" stop-color="oklch(0.45 0.2 12)"/>
    </linearGradient>
  </defs>
  <g filter="url(#hg)">
    <path d="M20 2 C10 2 4 9 4 18 C4 28 20 48 20 48 C20 48 36 28 36 18 C36 9 30 2 20 2 Z"
          fill="url(#hgrad)" stroke="#0B1020" stroke-width="2"/>
    <circle cx="20" cy="18" r="10" fill="#0B1020" opacity="0.9"/>
    <g transform="translate(13 11) scale(0.6)" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10 L12 2 L21 10 V21 H3 Z"/>
      <path d="M9 21 V13 H15 V21"/>
    </g>
  </g>
</svg>`.trim();
}

export function homePinDataUrl(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(buildHomePinSvg())}`;
}