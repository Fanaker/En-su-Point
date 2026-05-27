import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthShell } from "@/components/layout/AuthShell";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ email: z.string().email().catch("") });

export const Route = createFileRoute("/verificar")({
  validateSearch: (s) => search.parse(s),
  component: VerifyPage,
});

function VerifyPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onVerify = async (token: string) => {
    if (!email) { toast.error("Falta el correo"); return; }
    if (token.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setLoading(false);
    if (error) {
      toast.error("Código inválido");
      setCode("");
      return;
    }
    toast.success("Tu cuenta ha sido verificada");
    navigate({ to: "/inicio" });
  };

  const onResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) toast.error("No se pudo reenviar el código");
    else toast.success("Código enviado correctamente");
  };

  return (
    <AuthShell
      title="Verifica tu correo"
      subtitle={email ? `Ingresa el código de 6 dígitos enviado a ${email}` : "Ingresa el código que te enviamos"}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary">
          <MailCheck className="h-7 w-7 text-white" />
        </div>

        <InputOTP
          maxLength={6}
          value={code}
          onChange={(v) => { setCode(v); if (v.length === 6) onVerify(v); }}
          containerClassName="justify-center"
        >
          <InputOTPGroup>
            {[0,1,2,3,4,5].map((i) => (
              <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg bg-input/60 border-border" />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button onClick={() => onVerify(code)} disabled={loading || code.length !== 6}
          className="w-full h-11 bg-gradient-primary shadow-glow-primary font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar cuenta"}
        </Button>

        <button onClick={onResend} disabled={resending}
          className="text-sm text-muted-foreground hover:text-foreground transition">
          {resending ? "Enviando..." : "¿No recibiste el código? Reenviar"}
        </button>
      </div>
    </AuthShell>
  );
}
