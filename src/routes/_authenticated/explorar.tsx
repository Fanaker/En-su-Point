import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Compass, Search, SlidersHorizontal, PlusCircle } from "lucide-react";
import { PointCard, type PointCardData } from "@/components/points/PointCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/explorar")({ component: Page });

function Page() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: points = [], isLoading } = useQuery<PointCardData[]>({
    queryKey: ["points", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points")
        .select("id,title,district,image_url,avg_rating,total_reviews,category_id,categories(name)")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as unknown as PointCardData[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return points.filter((p) => {
      if (cat && (p as any).category_id !== cat) return false;
      if (!term) return true;
      return (
        p.title.toLowerCase().includes(term) ||
        p.district.toLowerCase().includes(term) ||
        (p.categories?.name?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [points, q, cat]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          <Compass className="h-3.5 w-3.5" /> Explorar
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Descubre los <span className="text-gradient">points</span> de Lima
        </h1>
      </header>

      <div className="glass rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, distrito, categoría…"
              className="pl-9 bg-surface/40 border-border"
            />
          </div>
          <Button variant="outline" size="icon" className="bg-surface/40 border-border md:hidden">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCat(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              !cat ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/40 text-muted-foreground hover:text-foreground"
            )}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                cat === c.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-surface/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <h3 className="text-lg font-semibold">Aún no hay points por aquí</h3>
          <p className="mt-2 text-sm text-muted-foreground">Sé el primero en compartir un spot secreto.</p>
          <Link to="/crear">
            <Button className="mt-5 bg-gradient-primary shadow-glow-primary">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear un Point
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <PointCard key={p.id} point={p} />)}
        </div>
      )}
    </div>
  );
}
