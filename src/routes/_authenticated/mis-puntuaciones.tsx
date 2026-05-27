import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star, MessageCircle, ChevronDown, Pencil, Trash2, Check, X } from "lucide-react";
import { RatingStars } from "@/components/points/RatingStars";
import { usePointModal } from "@/components/points/PointModalContext";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mis-puntuaciones")({ component: MyActivity });

function MyActivity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { open } = usePointModal();
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);

  const { data: ratings = [] } = useQuery({
    enabled: !!user,
    queryKey: ["my-ratings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ratings")
        .select("id,stars,created_at,point:point_id(id,title,district,image_url,categories(name))")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    enabled: !!user,
    queryKey: ["my-comments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("comments")
        .select("id,content,created_at,point:point_id(id,title,district,image_url)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const visibleRatings = showAllRatings ? ratings : ratings.slice(0, 5);
  const visibleComments = showAllComments ? comments : comments.slice(0, 5);

  const updateRating = async (id: string, stars: number) => {
    const { error } = await supabase.from("ratings").update({ stars }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-ratings", user?.id] });
    qc.invalidateQueries({ queryKey: ["points"] });
    toast.success("Puntuación actualizada");
  };

  const deleteRating = async (id: string) => {
    if (!confirm("¿Eliminar esta puntuación?")) return;
    const { error } = await supabase.from("ratings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-ratings", user?.id] });
    toast.success("Puntuación eliminada");
  };

  const saveComment = async () => {
    if (!editingComment?.content.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editingComment.content.trim() }).eq("id", editingComment.id);
    if (error) return toast.error(error.message);
    setEditingComment(null);
    qc.invalidateQueries({ queryKey: ["my-comments", user?.id] });
    toast.success("Comentario actualizado");
  };

  const deleteComment = async (id: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-comments", user?.id] });
    toast.success("Comentario eliminado");
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-3xl mx-auto space-y-8">
      <section>
        <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <Star className="h-6 w-6 text-primary" /> Mis Reseñas
        </h1>
        {ratings.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Aún no has valorado ningún point.
          </p>
        ) : (
          <div className="space-y-2">
            {(visibleRatings as any[]).map((r) => (
              <div key={r.id} className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-gradient-card p-3 text-left transition hover:bg-surface/60">
                {r.point?.image_url
                  ? <img src={r.point.image_url} className="h-14 w-14 rounded-lg object-cover" alt="" />
                  : <div className="h-14 w-14 rounded-lg bg-surface" />}
                <button onClick={() => r.point && open(r.point.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold">{r.point?.title ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.point?.categories?.name} · {r.point?.district}
                  </p>
                </button>
                <RatingStars value={r.stars} onChange={(stars) => updateRating(r.id, stars)} />
                <Button size="icon" variant="ghost" onClick={() => deleteRating(r.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {ratings.length > 5 && (
              <button onClick={() => setShowAllRatings(!showAllRatings)}
                className="mx-auto flex items-center gap-1 rounded-full border border-border/60 bg-surface/40 px-4 py-1.5 text-xs font-medium text-primary hover:bg-surface/70">
                {showAllRatings ? "Ver menos" : `Ver ${ratings.length - 5} más`}
                <ChevronDown className={`h-3 w-3 transition ${showAllRatings ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <MessageCircle className="h-6 w-6 text-primary" /> Mis Comentarios
        </h2>
        {comments.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Aún no has comentado en ningún point.
          </p>
        ) : (
          <div className="space-y-2">
            {(visibleComments as any[]).map((c) => (
              <div key={c.id} className="block w-full rounded-2xl border border-border/60 bg-gradient-card p-3 text-left transition hover:bg-surface/60">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => c.point && open(c.point.id)} className="truncate text-sm font-semibold text-primary hover:underline">{c.point?.title ?? "—"}</button>
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {editingComment?.id === c.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={editingComment?.content ?? ""} onChange={(e) => setEditingComment({ id: c.id, content: e.target.value })} rows={2} className="bg-background/50" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
                      <Button size="sm" onClick={saveComment} className="bg-gradient-primary"><Check className="mr-1 h-3.5 w-3.5" /> Guardar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm text-foreground/90">{c.content}</p>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingComment({ id: c.id, content: c.content })} className="h-8 w-8 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteComment(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {comments.length > 5 && (
              <button onClick={() => setShowAllComments(!showAllComments)}
                className="mx-auto flex items-center gap-1 rounded-full border border-border/60 bg-surface/40 px-4 py-1.5 text-xs font-medium text-primary hover:bg-surface/70">
                {showAllComments ? "Ver menos" : `Ver ${comments.length - 5} más`}
                <ChevronDown className={`h-3 w-3 transition ${showAllComments ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}