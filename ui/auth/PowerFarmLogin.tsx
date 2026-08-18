"use client";
import { useState } from "react";

/**
 * Bloco canónico de entrada da PowerFarm.
 *
 * Não conhece o Registry. Não importa Supabase. Não sabe para onde volta.
 * Recebe tudo isso, porque o Registry é apenas o primeiro consumidor e amanhã
 * a plataforma e um parceiro consomem a mesma peça.
 *
 * A separação que isto preserva: a ORIGEM do componente e o REDIRECT URI são
 * responsabilidades diferentes. O bloco é partilhado; a volta pertence a quem
 * iniciou o fluxo e está registada no cliente OAuth por correspondência exacta.
 * Um destino passado por parâmetro seria um open redirect.
 *
 * A gramática é a mesma que vai servir consent, install e onboarding:
 * identidade, intenção, requisitos, autoridade, consentimento, execução,
 * verificação, recibo. Aqui só as primeiras aparecem; as outras entram quando
 * as apostas subirem.
 */
export type MetodoSenha = (email: string, senha: string) => Promise<{ erro?: string }>;
export type MetodoLink = (email: string) => Promise<{ erro?: string; mensagem?: string }>;

export type ContextoLogin = {
  /** Que produto está a pedir a entrada. Aparece ao utilizador. */
  produto: string;
  /** Quem autentica. Mostrado para o utilizador saber a quem se está a identificar. */
  emissor: string;
  /** Para onde o fluxo volta. Do consumidor, nunca do componente. */
  destino: string;
  entrarComSenha?: MetodoSenha;
  pedirLink?: MetodoLink;
  aoEntrar?: () => void;
};

export function PowerFarmLogin({ ctx }: { ctx: ContextoLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function comSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!ctx.entrarComSenha) return;
    setOcupado(true); setErro(null); setMsg(null);
    const r = await ctx.entrarComSenha(email, senha);
    if (r.erro) { setErro(r.erro); setOcupado(false); return; }
    ctx.aoEntrar?.();
  }

  async function porLink() {
    if (!ctx.pedirLink) return;
    setOcupado(true); setErro(null); setMsg(null);
    const r = await ctx.pedirLink(email);
    setOcupado(false);
    if (r.erro) setErro(r.erro); else setMsg(r.mensagem ?? "Link enviado. Verifica o email.");
  }

  return (
    <>
      <h1>Entrar</h1>
      <p className="sub">
        {ctx.produto} · identificas-te em <span className="mono">{ctx.emissor}</span>
      </p>

      <div className="card" style={{ maxWidth: 400 }}>
        <form onSubmit={comSenha}>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input type="email" value={email} required autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} />
          </div>

          {ctx.entrarComSenha && (
            <div style={{ marginBottom: 18 }}>
              <label>Senha</label>
              <input type="password" value={senha} autoComplete="current-password"
                onChange={(e) => setSenha(e.target.value)} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {ctx.entrarComSenha && (
              <button type="submit" disabled={ocupado || !email}>Entrar</button>
            )}
            {ctx.pedirLink && (
              <button type="button" className="ghost" disabled={ocupado || !email}
                onClick={porLink}>Enviar link</button>
            )}
          </div>
        </form>

        {msg && <p className="sub" style={{ margin: "14px 0 0" }}>{msg}</p>}
        {erro && <p className="erro">{erro}</p>}

        <p className="volta mono">volta a {ctx.destino}</p>
      </div>
    </>
  );
}
