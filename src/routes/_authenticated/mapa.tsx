import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Map as MapIcon } from "lucide-react";
import { usePointModal } from "@/components/points/PointModalContext";
import type { MapboxPoint } from "@/components/map/MapboxMap";
import { CategoryFilter } from "@/components/map/CategoryFilter";

const MapboxMap = lazy(() => import("@/components/map/MapboxMap"));

export const Route = createFileRoute("/_authenticated/mapa")({ component: MapPage });

function MapPage() {
  const { open } = usePointModal();
  const [filterSlug, setFilterSlug] = useState<string | null>(null);
  const { data: points = [], isLoading } = useQuery<MapboxPoint[]>({
    queryKey: ["points", "with-coords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points")
        .select("id,title,district,latitude,longitude,image_url,avg_rating,total_reviews,categories(slug)")
        .not("latitude", "is", null).not("longitude", "is", null);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({ ...p, category_slug: p.categories?.slug ?? null }));
    },
  });

  const filtered = useMemo(
    () => filterSlug ? points.filter((p) => p.category_slug === filterSlug) : points,
    [filterSlug, points],
  );

  return (
    <div className="px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <MapIcon className="h-3.5 w-3.5" /> Mapa
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Lima en <span className="text-gradient">tiempo real</span>
          </h1>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} points {filterSlug ? "filtrados" : "en el mapa"}</span>
      </div>

      <div className="mb-3"><CategoryFilter selected={filterSlug} onChange={setFilterSlug} /></div>
      <div className="relative h-[calc(100vh-220px)] min-h-[420px] overflow-hidden rounded-3xl border border-border/60 shadow-elegant">
        {isLoading ? (
          <div className="flex h-full items-center justify-center bg-surface/40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <MapboxMap points={filtered} onSelect={(p) => open(p.id)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
