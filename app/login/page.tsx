"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function comSenha(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true); setErro(null); setMsg(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: pass });
    if (error) { setErro(error.message); setOcupado(false); return; }
    window.location.href = "/";
  }

  async function porLink() {
    setOcupado(true); setErro(null); setMsg(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setOcupado(false);
    if (error) setErro(error.message);
    else setMsg("Link enviado. Verifica o email.");
  }

  return (
    <>
      <h1>Entrar</h1>
      <p className="sub">Registry da PowerFarm</p>
      <div className="card" style={{ maxWidth: 380 }}>
        <form onSubmit={comSenha}>
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Senha</label>
            <input type="password" value={pass}
              onChange={(e) => setPass(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={ocupado || !email}>Entrar</button>
            <button type="button" className="ghost" disabled={ocupado || !email}
              onClick={porLink}>Enviar link</button>
          </div>
        </form>
        {msg && <p className="sub" style={{ margin: "12px 0 0" }}>{msg}</p>}
        {erro && <p className="erro">{erro}</p>}
      </div>
    </>
  );
}
