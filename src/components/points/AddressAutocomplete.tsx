import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { searchAddress, type GeocodeResult } from "@/lib/mapbox-geocode";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: GeocodeResult) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, id }: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length < 3) { setResults([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchAddress(value, ctrl.signal);
        setResults(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => { ctrl.abort(); if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        autoComplete="off"
        placeholder={placeholder}
        className="bg-surface/40"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border/60 bg-popover/98 backdrop-blur-xl shadow-elegant">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onSelect(r); setOpen(false); }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface/60"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="line-clamp-2">{r.placeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}