import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/layout/AuthShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/registro")({ component: RegisterPage });

const schema = z.object({
  display_name: z.string().trim().min(2, "Nombre muy corto").max(50),
  email: z.string().trim().email("Correo inválido").max(255),
  password: z.string().min(6, "Contraseña mínima de 6 caracteres").max(72),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.display_name },
        emailRedirectTo: `${window.location.origin}/inicio`,
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("registered")) toast.error("Este correo ya está registrado");
      else toast.error(error.message);
      return;
    }
    toast.success("Código enviado correctamente");
    navigate({ to: "/verificar", search: { email: parsed.data.email } });
  };

  const onGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/inicio` },
    });
    if (error) { setLoading(false); toast.error("No se pudo continuar con Google"); }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Únete a la comunidad y descubre Lima"
      footer={<>¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-primary hover:text-primary-glow">Inicia sesión</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" placeholder="Tu nombre" className="pl-10 h-11 bg-input/60 border-border"
              value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" placeholder="tu@correo.com"
              className="pl-10 h-11 bg-input/60 border-border"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres"
              className="pl-10 h-11 bg-input/60 border-border"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary shadow-glow-primary text-base font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button onClick={onGoogle} variant="outline" className="w-full h-11 bg-surface/40 border-border hover:bg-surface" disabled={loading}>
        Continuar con Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Al registrarte aceptas nuestros términos y política de privacidad.
      </p>
    </AuthShell>
  );
}
