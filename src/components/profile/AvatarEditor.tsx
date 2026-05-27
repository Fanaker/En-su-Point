import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string | null;
  fallback?: string;
  onSaved?: () => void;
}

/** Recorta el área seleccionada y devuelve un Blob JPEG cuadrado de 384px */
async function cropImageToBlob(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export function AvatarEditor({ open, onOpenChange, currentAvatarUrl, fallback, onSaved }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSrc(null); setCrop({ x: 0, y: 0 }); setZoom(1); setAreaPx(null);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Máximo 8MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => setAreaPx(pixels), []);

  const save = async () => {
    if (!user || !src || !areaPx) return;
    setSaving(true);
    try {
      const blob = await cropImageToBlob(src, areaPx);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const up = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true, contentType: "image/jpeg",
      });
      if (up.error) throw up.error;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      toast.success("Avatar actualizado");
      onSaved?.();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Foto eliminada");
    onSaved?.();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Foto de perfil</DialogTitle>
          <DialogDescription>Sube una imagen y ajusta el encuadre. Será cuadrada.</DialogDescription>
        </DialogHeader>

        {!src ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-28 w-28 ring-2 ring-primary/40">
              <AvatarImage src={currentAvatarUrl ?? undefined} />
              <AvatarFallback className="text-lg">{fallback ?? "?"}</AvatarFallback>
            </Avatar>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            <div className="flex w-full flex-col gap-2">
              <Button onClick={() => fileRef.current?.click()} className="bg-gradient-primary shadow-glow-primary">
                <Upload className="mr-2 h-4 w-4" /> {currentAvatarUrl ? "Cambiar foto" : "Subir foto"}
              </Button>
              {currentAvatarUrl && (
                <Button variant="outline" onClick={removePhoto} disabled={saving}
                  className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Quitar foto actual
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Zoom</label>
              <Slider value={[zoom]} min={1} max={4} step={0.05}
                onValueChange={(v) => setZoom(v[0])} className="mt-2" />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {src ? (
            <Button variant="ghost" onClick={reset} disabled={saving}>Cambiar imagen</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cerrar</Button>
            {src && (
              <Button onClick={save} disabled={saving || !areaPx} className="bg-gradient-primary shadow-glow-primary">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : "Guardar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}