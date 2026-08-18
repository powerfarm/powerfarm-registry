"use client";
import { PowerFarmLogin } from "@/ui/auth/PowerFarmLogin";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { PUBLIC_BASE_URL, callbackUrl } from "@/lib/base-url";

// O Registry e apenas o primeiro consumidor do bloco canonico. Ele traz o
// fluxo real — Supabase — e o SEU proprio destino de volta. Outro app amanha
// usa o mesmo componente e traz o dele.
export default function Login() {
  const ctx = {
    produto: "Registry da PowerFarm",
    emissor: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host,
    destino: callbackUrl(),

    entrarComSenha: async (email: string, senha: string) => {
      const { error } = await supabaseBrowser().auth
        .signInWithPassword({ email, password: senha });
      return error ? { erro: error.message } : {};
    },

    pedirLink: async (email: string) => {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email,
        // O destino e do consumidor e esta na allowlist do emissor.
        options: { emailRedirectTo: callbackUrl() },
      });
      return error ? { erro: error.message } : {};
    },

    aoEntrar: () => { window.location.href = PUBLIC_BASE_URL + "/"; },
  };

  return <PowerFarmLogin ctx={ctx} />;
}
