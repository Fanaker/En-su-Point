import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CategoryPill } from "./CategoryPill";
import { RatingStars } from "./RatingStars";
import { ReactionsBar } from "./ReactionsBar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  MapPin, Bookmark, BookmarkCheck, Send, MessageCircle, Map as MapIcon, Trash2, X, Pencil, Check,
  Camera,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/points/AddressAutocomplete";
import { PointImage } from "@/components/points/PointImage";
import { LIMA_DISTRICTS } from "@/lib/lima";

export function PointDetailModal({
  pointId, open, onOpenChange,
}: {
  pointId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingPoint, setEditingPoint] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [editDraft, setEditDraft] = useState({
    title: "", address: "", district: "", reference: "", description: "", latitude: "", longitude: "", category_id: "",
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const { data: point } = useQuery({
    enabled: !!pointId && open,
    queryKey: ["point-modal", pointId],
    queryFn: async () => {
      const { data, error } = await supabase.from("points")
        .select("*, categories(name,slug,icon)")
        .eq("id", pointId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    enabled: open,
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").order("name");
      return data ?? [];
    },
  });
  const [editingCat, setEditingCat] = useState(false);
  const [newCatId, setNewCatId] = useState<string>("");

  const { data: author } = useQuery({
    enabled: !!point?.created_by && !point?.is_anonymous,
    queryKey: ["point-author", point?.created_by],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("display_name,avatar_url,username")
        .eq("id", point!.created_by!).maybeSingle();
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    enabled: !!pointId && open,
    queryKey: ["comments", pointId],
    queryFn: async () => {
      const { data, error } = await supabase.from("comments")
        .select("id,content,created_at,user_id,is_anonymous")
        .eq("point_id", pointId!).order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.filter(r => !r.is_anonymous).map(r => r.user_id)));
      let profileMap: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles")
          .select("id,display_name,avatar_url,username").in("id", ids);
        profileMap = Object.fromEntries((profs ?? []).map(p => [p.id, p]));
      }
      return rows.map(r => ({ ...r, profile: profileMap[r.user_id] ?? null }));
    },
  });

  const { data: myRating = 0 } = useQuery({
    enabled: !!pointId && open && !!user,
    queryKey: ["my-rating", pointId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ratings").select("stars")
        .eq("point_id", pointId!).eq("user_id", user!.id).maybeSingle();
      return data?.stars ?? 0;
    },
  });

  const { data: saved = false } = useQuery({
    enabled: !!pointId && open && !!user,
    queryKey: ["saved", pointId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_places").select("id")
        .eq("point_id", pointId!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const setRating = async (n: number) => {
    if (!user || !pointId) return;
    const { error } = await supabase.from("ratings").upsert(
      { point_id: pointId, user_id: user.id, stars: n }, { onConflict: "point_id,user_id" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-rating", pointId] });
    qc.invalidateQueries({ queryKey: ["point-modal", pointId] });
    qc.invalidateQueries({ queryKey: ["points"] });
    toast.success("¡Gracias por valorar!");
  };

  const toggleSave = async () => {
    if (!user || !pointId) return;
    if (saved) {
      await supabase.from("saved_places").delete()
        .eq("point_id", pointId).eq("user_id", user.id);
    } else {
      await supabase.from("saved_places").insert({ point_id: pointId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["saved", pointId] });
    qc.invalidateQueries({ queryKey: ["saved-points"] });
    toast.success(saved ? "Quitado de guardados" : "Guardado");
  };

  const sendComment = async () => {
    if (!user || !pointId || !comment.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("comments")
      .insert({ point_id: pointId, user_id: user.id, content: comment.trim() });
    setPosting(false);
    if (error) return toast.error(error.message);
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", pointId] });
  };

  const deletePoint = async () => {
    if (!pointId || !confirm("¿Eliminar este Point?")) return;
    const { error } = await supabase.from("points").delete().eq("id", pointId);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  const cat: any = (point as any)?.categories;
  const isOwner = user?.id === point?.created_by;
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (!point) return;
    setEditDraft({
      title: point.title ?? "",
      address: point.address ?? "",
      district: point.district ?? "",
      reference: point.reference ?? "",
      description: point.description ?? "",
      latitude: point.latitude != null ? String(point.latitude) : "",
      longitude: point.longitude != null ? String(point.longitude) : "",
      category_id: (point as any).category_id ?? "",
    });
    setEditFile(null);
  }, [point]);

  const saveCategory = async () => {
    if (!pointId || !newCatId) return;
    const { error } = await supabase.from("points").update({ category_id: newCatId }).eq("id", pointId);
    if (error) return toast.error(error.message);
    toast.success("Categoría actualizada");
    setEditingCat(false);
    qc.invalidateQueries({ queryKey: ["point-modal", pointId] });
    qc.invalidateQueries({ queryKey: ["points"] });
  };

  const savePointDetails = async () => {
    if (!pointId || !user) return;
    if (editDraft.title.trim().length < 3 || editDraft.address.trim().length < 3 || !editDraft.district || !editDraft.category_id) {
      toast.error("Completa nombre, categoría, distrito y dirección.");
      return;
    }
    setSavingPoint(true);
    let image_url = point?.image_url ?? null;
    if (editFile) {
      const ext = editFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${pointId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("points").upload(path, editFile, {
        cacheControl: "3600", upsert: false, contentType: editFile.type,
      });
      if (upErr) { setSavingPoint(false); toast.error(upErr.message); return; }
      image_url = supabase.storage.from("points").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("points").update({
      title: editDraft.title.trim(),
      category_id: editDraft.category_id,
      district: editDraft.district,
      address: editDraft.address.trim(),
      reference: editDraft.reference.trim() || null,
      description: editDraft.description.trim() || null,
      latitude: editDraft.latitude ? Number(editDraft.latitude) : null,
      longitude: editDraft.longitude ? Number(editDraft.longitude) : null,
      image_url,
    }).eq("id", pointId);
    setSavingPoint(false);
    if (error) return toast.error(error.message);
    toast.success("Point actualizado");
    setEditingPoint(false);
    setEditFile(null);
    qc.invalidateQueries({ queryKey: ["point-modal", pointId] });
    qc.invalidateQueries({ queryKey: ["points"] });
    qc.invalidateQueries({ queryKey: ["my-points"] });
  };

  const removeComment = async (id: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["comments", pointId] });
    toast.success("Eliminado");
  };

  const saveComment = async (id: string) => {
    if (!commentDraft.trim()) return toast.error("El comentario no puede estar vacío");
    const { error } = await supabase.from("comments").update({ content: commentDraft.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingCommentId(null);
    setCommentDraft("");
    qc.invalidateQueries({ queryKey: ["comments", pointId] });
    qc.invalidateQueries({ queryKey: ["my-comments"] });
    toast.success("Comentario actualizado");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-border/60 bg-background/98 backdrop-blur-2xl">
        {!point ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            {/* Cover */}
            <div className="relative h-64 w-full overflow-hidden rounded-t-lg sm:h-80">
              <PointImage src={point.image_url} alt={point.title} category={cat} iconClassName="h-24 w-24" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <button onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <div className="flex items-center gap-2">
                  {editingCat ? (
                    <>
                      <Select value={newCatId || (point as any).category_id} onValueChange={setNewCatId}>
                        <SelectTrigger className="h-8 w-48 bg-surface/40"><SelectValue placeholder="Categoría" /></SelectTrigger>
                        <SelectContent>
                          {(categories as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={saveCategory} className="h-8 bg-gradient-primary"><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCat(false)} className="h-8"><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <CategoryPill name={cat?.name} />
                      {canEdit && (
                        <button onClick={() => { setNewCatId((point as any).category_id ?? ""); setEditingCat(true); }}
                          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                      )}
                    </>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{point.title}</h2>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {point.district} · {point.address}
                </div>
                {point.reference && (
                  <p className="mt-1 text-xs text-muted-foreground">Ref: {point.reference}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-surface/60 px-3 py-1.5">
                  <RatingStars value={Number(point.avg_rating) || 0} size={16} />
                  <span className="text-sm font-semibold">{Number(point.avg_rating).toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({point.total_reviews})</span>
                </div>
                <Button onClick={toggleSave} size="sm" variant="outline" className="bg-surface/40 border-border">
                  {saved ? <><BookmarkCheck className="mr-2 h-4 w-4 text-primary" /> Guardado</> : <><Bookmark className="mr-2 h-4 w-4" /> Guardar</>}
                </Button>
                {point.latitude != null && point.longitude != null && (
                  <Button size="sm" variant="outline" className="bg-surface/40 border-border"
                    onClick={() => {
                      onOpenChange(false);
                      navigate({ to: "/mapa", search: { focus: point.id } as any });
                    }}>
                    <MapIcon className="mr-2 h-4 w-4" /> Ver en mapa
                  </Button>
                )}
                {(isOwner || isAdmin) && (
                  <>
                    <Button onClick={() => setEditingPoint((v) => !v)} size="sm" variant="outline"
                      className="bg-surface/40 border-border">
                      <Pencil className="mr-2 h-4 w-4" /> {editingPoint ? "Cancelar edición" : "Editar Point"}
                    </Button>
                    <Button onClick={deletePoint} size="sm" variant="outline"
                      className="bg-surface/40 border-destructive/40 text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  </>
                )}
              </div>

              {editingPoint && (
                <div className="grid gap-4 rounded-2xl border border-border/60 bg-surface/35 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Nombre</Label>
                    <Input value={editDraft.title} maxLength={80} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} className="mt-2 bg-background/50" />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Select value={editDraft.category_id} onValueChange={(v) => setEditDraft({ ...editDraft, category_id: v })}>
                      <SelectTrigger className="mt-2 bg-background/50"><SelectValue placeholder="Categoría" /></SelectTrigger>
                      <SelectContent>{(categories as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Distrito</Label>
                    <Select value={editDraft.district} onValueChange={(v) => setEditDraft({ ...editDraft, district: v })}>
                      <SelectTrigger className="mt-2 bg-background/50"><SelectValue placeholder="Distrito" /></SelectTrigger>
                      <SelectContent className="max-h-72">{LIMA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Dirección</Label>
                    <div className="mt-2">
                      <AddressAutocomplete
                        value={editDraft.address}
                        onChange={(v) => setEditDraft({ ...editDraft, address: v })}
                        onSelect={(r) => setEditDraft((d) => ({ ...d, address: r.address || r.placeName, latitude: r.latitude.toFixed(6), longitude: r.longitude.toFixed(6), district: r.district && (LIMA_DISTRICTS as readonly string[]).includes(r.district) ? r.district : d.district }))}
                        placeholder="Busca la dirección del Point"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Referencia</Label>
                    <Input value={editDraft.reference} maxLength={160} onChange={(e) => setEditDraft({ ...editDraft, reference: e.target.value })} className="mt-2 bg-background/50" />
                  </div>
                  <div>
                    <Label>Imagen</Label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="mt-2 w-full bg-background/50 border-border">
                      <Camera className="mr-2 h-4 w-4" /> {editFile ? editFile.name : "Cambiar imagen"}
                    </Button>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea value={editDraft.description} maxLength={1000} rows={3} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} className="mt-2 bg-background/50" />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button onClick={savePointDetails} disabled={savingPoint} className="bg-gradient-primary shadow-glow-primary">
                      {savingPoint ? "Guardando…" : "Guardar cambios"}
                    </Button>
                  </div>
                </div>
              )}

              <ReactionsBar pointId={point.id} />

              {point.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {point.description}
                </p>
              )}

              {!point.is_anonymous && author && (
                <div className="flex items-center gap-3 border-t border-border/60 pt-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={author.avatar_url ?? undefined} />
                    <AvatarFallback>{(author.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{author.display_name ?? "Usuario"}</p>
                    {author.username && (
                      <Link to="/u/$username" params={{ username: author.username }}
                        onClick={() => onOpenChange(false)}
                        className="text-xs text-primary hover:underline">@{author.username}</Link>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-surface/40 p-4">
                <p className="text-sm font-medium">¿Cómo lo valoras?</p>
                <div className="mt-2"><RatingStars value={myRating} size={26} onChange={setRating} /></div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold">Comentarios ({comments.length})</h3>
                </div>
                <div className="rounded-2xl bg-surface/40 p-3">
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500}
                    rows={2} placeholder="Cuenta tu experiencia…" className="bg-background/50" />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={sendComment} disabled={posting || !comment.trim()}
                      className="bg-gradient-primary shadow-glow-primary">
                      <Send className="mr-2 h-3.5 w-3.5" /> Enviar
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(comments as any[]).map((c) => (
                    <div key={c.id} className="rounded-2xl bg-surface/40 p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{(c.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-xs font-medium">
                            {c.is_anonymous ? "Anónimo" : (
                              c.profile?.username ? (
                                <Link to="/u/$username" params={{ username: c.profile.username }}
                                  onClick={() => onOpenChange(false)}
                                  className="hover:text-primary hover:underline">
                                  {c.profile.display_name ?? "Usuario"}
                                </Link>
                              ) : (c.profile?.display_name ?? "Usuario")
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        {(isAdmin || c.user_id === user?.id) && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingCommentId(c.id); setCommentDraft(c.content); }}
                              className="text-muted-foreground hover:text-primary" aria-label="Editar comentario">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeComment(c.id)}
                              className="text-muted-foreground hover:text-destructive" aria-label="Eliminar comentario">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === c.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea value={commentDraft} maxLength={500} rows={2}
                            onChange={(e) => setCommentDraft(e.target.value)} className="bg-background/50" />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                            <Button size="sm" onClick={() => saveComment(c.id)} className="bg-gradient-primary">Guardar</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">{c.content}</p>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Sé el primero en comentar.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}