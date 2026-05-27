import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark, Star } from "lucide-react";
import { PointCard, type PointCardData } from "@/components/points/PointCard";
import { CategoryFilter } from "@/components/map/CategoryFilter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/guardados")({ component: SavedPage });

function SavedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterSlug, setFilterSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<"all" | "favorites">("all");
  const { data = [] } = useQuery<any[]>({
    enabled: !!user,
    queryKey: ["saved-points", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_places")
        .select("id,is_favorite,points(id,title,district,image_url,avg_rating,total_reviews,categories(name,slug,icon))")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data ?? []).filter((s: any) => s.points);
    },
  });
  const rows = useMemo(() => mode === "favorites" ? data.filter((s) => s.is_favorite) : data, [data, mode]);
  const filtered = useMemo(
    () => filterSlug ? rows.filter((s) => s.points?.categories?.slug === filterSlug) : rows,
    [rows, filterSlug],
  );
  const toggleFavorite = async (savedId: string, current: boolean) => {
    const { error } = await supabase.from("saved_places").update({ is_favorite: !current } as any).eq("id", savedId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["saved-points", user?.id] });
    toast.success(!current ? "Agregado a Mis Points Favoritos" : "Quitado de favoritos");
  };
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Bookmark className="h-6 w-6 text-primary" /> Mis guardados</h1>
      <div className="mb-5 space-y-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="bg-surface/60">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="favorites">Mis Points Favoritos</TabsTrigger>
          </TabsList>
        </Tabs>
        <CategoryFilter selected={filterSlug} onChange={setFilterSlug} />
      </div>
      {filtered.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Aún no guardas ningún point. Solo tú puedes ver esta lista.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => (
            <div key={s.id} className="relative">
              <PointCard point={s.points as PointCardData} />
              <Button size="sm" variant="outline" onClick={() => toggleFavorite(s.id, s.is_favorite)}
                className="absolute right-3 top-3 z-10 h-8 bg-background/75 border-border backdrop-blur">
                <Star className={`mr-1 h-3.5 w-3.5 ${s.is_favorite ? "fill-primary text-primary" : ""}`} /> Favorito
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}