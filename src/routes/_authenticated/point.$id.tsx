import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bookmark, BookmarkCheck, MapPin, MessageCircle, Send, Trash2 } from "lucide-react";
import { RatingStars } from "@/components/points/RatingStars";
import { CategoryPill } from "@/components/points/CategoryPill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/point/$id")({ component: PointDetail });

function PointDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: point, isLoading } = useQuery({
    queryKey: ["point", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points")
        .select("*, categories(name), profiles:created_by(display_name,avatar_url,username)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, is_anonymous, profiles:user_id(display_name,avatar_url)")
        .eq("point_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myRating } = useQuery({
    enabled: !!user,
    queryKey: ["my-rating", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings").select("stars").eq("point_id", id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.stars ?? 0;
    },
  });

  const { data: saved } = useQuery({
    enabled: !!user,
    queryKey: ["saved", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_places").select("id").eq("point_id", id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const setRating = async (n: number) => {
    if (!user) return;
    const { error } = await supabase.from("ratings").upsert(
      { point_id: id, user_id: user.id, stars: n },
      { onConflict: "point_id,user_id" }
    );
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-rating", id] });
    qc.invalidateQueries({ queryKey: ["point", id] });
    toast.success("¡Gracias por valorar!");
  };

  const toggleSave = async () => {
    if (!user) return;
    if (saved) {
      const { error } = await supabase.from("saved_places").delete().eq("point_id", id).eq("user_id", user.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("saved_places").insert({ point_id: id, user_id: user.id });
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ["saved", id] });
    qc.invalidateQueries({ queryKey: ["saved-points"] });
    toast.success(saved ? "Quitado de guardados" : "Guardado en tu lista");
  };

  const sendComment = async () => {
    if (!user || !comment.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      point_id: id, user_id: user.id, content: comment.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  const deletePoint = async () => {
    if (!confirm("¿Eliminar este Point?")) return;
    const { error } = await supabase.from("points").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Point eliminado");
    navigate({ to: "/explorar" });
  };

  if (isLoading) {
    return <div className="px-4 py-10 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!point) {
    return (
      <div className="px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Point no encontrado</h2>
        <Link to="/explorar"><Button className="mt-4">Volver a explorar</Button></Link>
      </div>
    );
  }

  const author: any = point.profiles;
  const isOwner = user?.id === point.created_by;

  return (
    <div className="pb-16">
      {/* Cover */}
      <div className="relative h-72 w-full overflow-hidden sm:h-96">
        {point.image_url ? (
          <img src={point.image_url} alt={point.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 via-surface to-burgundy/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute left-4 top-4">
          <Link to="/explorar">
            <Button size="icon" variant="outline" className="h-10 w-10 bg-background/60 backdrop-blur border-border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto -mt-16 max-w-3xl px-4 sm:px-6 relative">
        <div className="glass rounded-3xl p-6 shadow-elegant sm:p-8">
          <CategoryPill name={(point as any).categories?.name} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{point.title}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {point.district} · {point.address}
          </div>
          {point.reference && <p className="mt-1 text-xs text-muted-foreground">Ref: {point.reference}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <RatingStars value={Number(point.avg_rating) || 0} size={18} />
              <span className="text-sm font-medium">{Number(point.avg_rating).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({point.total_reviews})</span>
            </div>
            <Button onClick={toggleSave} size="sm" variant="outline" className="bg-surface/40 border-border">
              {saved ? <><BookmarkCheck className="mr-2 h-4 w-4 text-primary" /> Guardado</> : <><Bookmark className="mr-2 h-4 w-4" /> Guardar</>}
            </Button>
            {(isOwner || isAdmin) && (
              <Button onClick={deletePoint} size="sm" variant="outline" className="bg-surface/40 border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            )}
          </div>

          {point.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {point.description}
            </p>
          )}

          {!point.is_anonymous && author && (
            <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
              <Avatar className="h-10 w-10">
                <AvatarImage src={author.avatar_url ?? undefined} />
                <AvatarFallback>{(author.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{author.display_name ?? "Usuario"}</p>
                {author.username && <p className="text-xs text-muted-foreground">@{author.username}</p>}
              </div>
            </div>
          )}
        </div>

        {/* My rating */}
        <div className="mt-6 glass rounded-2xl p-5">
          <p className="text-sm font-medium">¿Cómo lo valoras?</p>
          <div className="mt-2">
            <RatingStars value={myRating ?? 0} size={26} onChange={setRating} />
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Comentarios ({comments.length})</h2>
          </div>
          <div className="glass rounded-2xl p-4">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500}
              rows={2} placeholder="Cuenta tu experiencia…" className="bg-surface/40" />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={sendComment} disabled={posting || !comment.trim()}
                className="bg-gradient-primary shadow-glow-primary">
                <Send className="mr-2 h-3.5 w-3.5" /> Enviar
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{(c.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.is_anonymous ? "Anónimo" : (c.profiles?.display_name ?? "Usuario")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sé el primero en comentar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}