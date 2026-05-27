import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Loader2, MapPin, Sparkles } from "lucide-react";
import { LIMA_DISTRICTS } from "@/lib/lima";
import { toast } from "sonner";
import { RatingStars } from "@/components/points/RatingStars";
import { AddressAutocomplete } from "@/components/points/AddressAutocomplete";
import { LIMA_CENTER } from "@/lib/lima";

const MapboxMap = lazy(() => import("@/components/map/MapboxMap"));

export const Route = createFileRoute("/_authenticated/crear")({ component: CreatePoint });

const schema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres").max(80),
  category_id: z.string().uuid("Elige una categoría"),
  district: z.string().min(1, "Elige un distrito"),
  address: z.string().trim().min(3, "Indica la dirección").max(160),
  reference: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  latitude: z.number({ required_error: "Marca el punto en el mapa" }).min(-90).max(90),
  longitude: z.number({ required_error: "Marca el punto en el mapa" }).min(-180).max(180),
});

function CreatePoint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [myStars, setMyStars] = useState(0);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    district: "",
    address: "",
    reference: "",
    description: "",
    latitude: String(LIMA_CENTER[0]),
    longitude: String(LIMA_CENTER[1]),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedCategorySlug = useMemo(
    () => (categories as any[]).find((c) => c.id === form.category_id)?.slug ?? null,
    [categories, form.category_id],
  );

  const pickerCoord = useMemo(() => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    return { lat: LIMA_CENTER[0], lng: LIMA_CENTER[1] };
  }, [form.latitude, form.longitude]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 6MB");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa el formulario");
      return;
    }
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("points").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        image_url = supabase.storage.from("points").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("points")
        .insert({
          ...parsed.data,
          reference: parsed.data.reference || null,
          description: parsed.data.description || null,
          image_url,
          is_anonymous: isAnonymous,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Si el creador valoró, guardamos su rating
      if (myStars > 0) {
        const { error: ratingError } = await supabase.from("ratings").upsert({
          point_id: data.id, user_id: user.id, stars: myStars,
        }, { onConflict: "point_id,user_id" });
        if (ratingError) toast.error("El Point se publicó, pero no pudimos guardar tu puntuación inicial.");
      }
      qc.invalidateQueries({ queryKey: ["points"] });
      qc.invalidateQueries({ queryKey: ["my-points"] });
      toast.success("¡Gracias por tu recomendación! Tu Point ya está en el mapa.");
      navigate({ to: "/inicio", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo crear el Point");
    } finally {
      setSubmitting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Tu navegador no soporta geolocalización"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast.success("Ubicación capturada");
      },
      () => toast.error("No pudimos obtener tu ubicación"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Crear un Point
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Comparte un <span className="text-gradient">spot</span> con la comunidad
          </h1>
          <p className="mt-2 text-muted-foreground">Cuanta más información, mejor lo encontrarán otros limeños.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass space-y-6 rounded-3xl p-6 shadow-elegant sm:p-8">
          {/* Image */}
          <div>
            <Label>Foto principal</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="group mt-2 flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface/40 transition hover:border-primary/50 hover:bg-surface/60"
            >
              {preview ? (
                <img src={preview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-9 w-9 text-primary/70" />
                  <span className="text-sm">Toca para subir una foto</span>
                  <span className="text-xs">JPG, PNG · máx 6MB</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Nombre del lugar</Label>
              <Input id="title" value={form.title} maxLength={80}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Carlitos Sangucheria"
                className="mt-2 bg-surface/40" />
            </div>

            <div>
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger className="mt-2 bg-surface/40"><SelectValue placeholder="Elige una" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Distrito</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                <SelectTrigger className="mt-2 bg-surface/40"><SelectValue placeholder="Elige uno" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {LIMA_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <div className="mt-2">
                <AddressAutocomplete
                  id="address"
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  onSelect={(r) => {
                    setForm((f) => ({
                      ...f,
                      address: r.address || r.placeName,
                      latitude: r.latitude.toFixed(6),
                      longitude: r.longitude.toFixed(6),
                      district: r.district && (LIMA_DISTRICTS as readonly string[]).includes(r.district) ? r.district : f.district,
                    }));
                    toast.success("Ubicación marcada en el mapa");
                  }}
                  placeholder="Empieza a escribir: Av. Larco 345…"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selecciona una sugerencia para fijar el pin automáticamente.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="ref">Referencia (opcional)</Label>
              <Input id="ref" value={form.reference} maxLength={160}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Frente al parque, piso 2…"
                className="mt-2 bg-surface/40" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="desc">Descripción</Label>
              <Textarea id="desc" rows={4} value={form.description} maxLength={1000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="¿Por qué deberían ir? Comparte tu experiencia."
                className="mt-2 bg-surface/40" />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}
                className="bg-surface/40 border-border">
                <MapPin className="mr-2 h-3.5 w-3.5" /> Usar mi ubicación actual
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Lat <code className="text-foreground/80">{Number(form.latitude).toFixed(5)}</code>
                {" · "}
                Lng <code className="text-foreground/80">{Number(form.longitude).toFixed(5)}</code>
              </span>
            </div>

            <div className="sm:col-span-2">
              <Label>Selecciona en el mapa</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Toca el mapa o arrastra el pin para fijar la ubicación exacta del Point.
              </p>
              <div className="relative mt-2 h-72 overflow-hidden rounded-2xl border border-border/60">
                <Suspense fallback={<div className="flex h-full items-center justify-center bg-surface/40"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}>
                  <MapboxMap
                    points={[]}
                    pickerMode
                    pickerCategorySlug={selectedCategorySlug}
                    initialPicker={pickerCoord}
                    onPick={(lat, lng) => setForm((f) => ({
                      ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6),
                    }))}
                    showUserLocation
                  />
                </Suspense>
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-border/60 bg-surface/30 px-4 py-3">
              <p className="text-sm font-medium">¿Cómo lo valoras tú?</p>
              <p className="text-xs text-muted-foreground">Tu propia recomendación cuenta como la primera reseña.</p>
              <div className="mt-2"><RatingStars value={myStars} size={26} onChange={setMyStars} /></div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border/60 bg-surface/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Publicar como anónimo</p>
                <p className="text-xs text-muted-foreground">Tu nombre no se mostrará públicamente.</p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
          </div>

          <Button type="submit" disabled={submitting}
            className="w-full h-12 bg-gradient-primary shadow-glow-primary text-base">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando…</> : "Publicar Point"}
          </Button>
        </form>
      </div>
    </div>
  );
}
