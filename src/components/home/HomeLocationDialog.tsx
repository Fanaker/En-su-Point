import { lazy, Suspense, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/points/AddressAutocomplete";
import { Loader2, House, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MapboxMap = lazy(() => import("@/components/map/MapboxMap"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    address: string | null;
    district: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  onSaved?: () => void;
}

export function HomeLocationDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(initial?.address ?? "");
    setDistrict(initial?.district ?? "");
    setPos(initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude } : null);
  }, [open, initial]);

  const save = async () => {
    if (!user || !pos || !address.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      home_address: address.trim(),
      home_district: district || null,
      home_latitude: pos.lat,
      home_longitude: pos.lng,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mi Hogar actualizado");
    onSaved?.();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      home_address: null, home_district: null, home_latitude: null, home_longitude: null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ubicación eliminada");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><House className="h-5 w-5 text-primary" /> Mi Hogar</DialogTitle>
          <DialogDescription>
            Busca tu dirección y luego ajusta el pin en el mapa al punto exacto. Tu ubicación es privada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Buscar dirección (referencia)</Label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={(r) => {
                setAddress(r.address || r.placeName);
                setDistrict(r.district ?? "");
                setPos({ lat: r.latitude, lng: r.longitude });
              }}
              placeholder="Av. Larco 123, Miraflores"
            />
          </div>

          <div className="relative h-[340px] overflow-hidden rounded-2xl border border-border/60">
            <Suspense fallback={<div className="flex h-full items-center justify-center bg-surface/40"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}>
              <MapboxMap
                points={[]}
                pickerMode
                initialPicker={pos}
                onPick={(lat, lng) => setPos({ lat, lng })}
                showUserLocation
              />
            </Suspense>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-[11px] backdrop-blur">
              {pos ? "Arrastra el pin para ajustar" : "Click en el mapa para colocar el pin"}
            </div>
          </div>
          {pos && (
            <p className="text-[11px] text-muted-foreground">
              Coordenadas: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {initial?.latitude != null ? (
            <Button variant="ghost" size="sm" onClick={remove} disabled={saving}
              className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !pos || !address.trim()} className="bg-gradient-primary shadow-glow-primary">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : "Guardar Mi Hogar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}