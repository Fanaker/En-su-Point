/**
 * Genera URLs de imagen de respaldo coherentes con la categoría del lugar.
 * Usa Unsplash Source (sin API key) con keywords ESTRICTAMENTE de la categoría
 * para que el resultado se parezca al tipo de sitio (no fotos random de la ciudad).
 */

const CATEGORY_QUERY: Record<string, string> = {
  restaurante: "restaurant,plated-food",
  karaoke: "karaoke,microphone-stage",
  hotel: "hotel-lobby,hotel-room",
  entretenimiento: "concert,party",
  cafe: "coffee-shop,latte-art",
  bar: "cocktail,bar-counter",
  rooftop: "rooftop-bar,skyline-night",
  "comida-rapida": "burger,fries",
  "centro-comercial": "shopping-mall,retail",
  "lugar-oculto": "alley-night,speakeasy",
  "spot-de-fotos": "viewpoint,scenic-overlook",
  polleria: "rotisserie-chicken,roasted-chicken",
  buffet: "buffet,food-table",
  otro: "lima-peru,plaza",
};

/**
 * Devuelve una URL de imagen 800x600 estable y coherente con la categoría.
 * Unsplash Source devuelve un 302 hacia una foto curada que coincide con los
 * keywords; al fijar `sig=<hash>` la imagen es determinista.
 */
export function getFallbackImageUrl(
  title: string,
  district: string,
  categorySlug?: string | null,
): string {
  const q = (categorySlug && CATEGORY_QUERY[categorySlug]) || CATEGORY_QUERY.otro;
  const sig = Math.abs(hashCode(`${title}|${district}|${categorySlug ?? ""}`)) % 100000;
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${sig}`;
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}