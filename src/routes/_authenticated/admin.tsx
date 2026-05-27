import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Trash2, MessageCircle, Star, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { usePointModal } from "@/components/points/PointModalContext";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { open } = usePointModal();

  const { data: points = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-points"],
    queryFn: async () => {
      const { data } = await supabase.from("points")
        .select("id,title,district,created_at,total_reviews,avg_rating,categories(name)")
        .order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments")
        .select("id,content,created_at,user_id,point_id,points(title)")
        .order("created_at", { ascending: false }).limit(100);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map(r => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,display_name,username").in("id", ids)
        : { data: [] as any[] };
      const m = Object.fromEntries((profs ?? []).map(p => [p.id, p]));
      return rows.map(r => ({ ...r, profile: m[r.user_id] ?? null }));
    },
  });

  const { data: ratings = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-ratings"],
    queryFn: async () => {
      const { data } = await supabase.from("ratings")
        .select("id,stars,created_at,user_id,point_id,points(title)")
        .order("created_at", { ascending: false }).limit(100);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map(r => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,display_name,username").in("id", ids)
        : { data: [] as any[] };
      const m = Object.fromEntries((profs ?? []).map(p => [p.id, p]));
      return rows.map(r => ({ ...r, profile: m[r.user_id] ?? null }));
    },
  });

  const removeComment = async (id: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comentario eliminado");
    qc.invalidateQueries({ queryKey: ["admin-comments"] });
    qc.invalidateQueries({ queryKey: ["comments"] });
  };

  const removeRating = async (id: string) => {
    if (!confirm("¿Eliminar esta puntuación?")) return;
    const { error } = await supabase.from("ratings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Puntuación eliminada");
    qc.invalidateQueries({ queryKey: ["admin-ratings"] });
  };

  const removePoint = async (id: string) => {
    if (!confirm("¿Eliminar este Point completo?")) return;
    const { error } = await supabase.from("points").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Point eliminado");
    qc.invalidateQueries({ queryKey: ["admin-points"] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  if (!isAdmin) {
    return (
      <div className="px-4 py-16 text-center">
        <Shield className="mx-auto h-10 w-10 text-burgundy-glow" />
        <h1 className="mt-3 text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo administradores pueden ver esta sección.</p>
        <Link to="/inicio" className="mt-4 inline-block text-sm text-primary hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-burgundy-glow" /> Panel de moderación
        </h1>
        <p className="text-sm text-muted-foreground">Gestiona points, comentarios y puntuaciones de la comunidad.</p>
      </div>

      <Tabs defaultValue="points">
        <TabsList className="bg-surface/60">
          <TabsTrigger value="points"><MapPin className="mr-1 h-3.5 w-3.5" /> Points</TabsTrigger>
          <TabsTrigger value="comments"><MessageCircle className="mr-1 h-3.5 w-3.5" /> Comentarios</TabsTrigger>
          <TabsTrigger value="ratings"><Star className="mr-1 h-3.5 w-3.5" /> Puntuaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="mt-4 space-y-2">
          {(points as any[]).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3">
              <button onClick={() => open(p.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {p.categories?.name} · {p.district} · ★ {Number(p.avg_rating).toFixed(1)} ({p.total_reviews})
                </p>
              </button>
              <Button variant="outline" size="sm" onClick={() => removePoint(p.id)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-2">
          {(comments as any[]).map((c) => (
            <div key={c.id} className="rounded-2xl border border-border/60 bg-gradient-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.profile?.display_name ?? "Usuario"}</span>
                    {" en "}
                    <button onClick={() => open(c.point_id)} className="text-primary hover:underline">{c.points?.title ?? "—"}</button>
                    {" · "}{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{c.content}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => removeComment(c.id)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4 space-y-2">
          {(ratings as any[]).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.profile?.display_name ?? "Usuario"}</span> valoró{" "}
                  <button onClick={() => open(r.point_id)} className="text-primary hover:underline">{r.points?.title ?? "—"}</button>
                  {" con "}<span className="text-amber-400">{"★".repeat(r.stars)}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeRating(r.id)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
