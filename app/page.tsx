import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

type Identidade = {
  id: string; kind: string; name: string; mandate: string | null; created_at: string;
};

async function criar(form: FormData) {
  "use server";
  const supabase = await supabaseServer();
  await supabase.from("identities").insert({
    kind: String(form.get("kind")),
    name: String(form.get("name")).trim(),
    mandate: String(form.get("mandate") || "").trim() || null,
  });
  revalidatePath("/");
}

export default async function Identidades() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("identities").select("*").order("kind").order("name");
  const lista = (data ?? []) as Identidade[];
  const conta = (k: string) => lista.filter((i) => i.kind === k).length;

  return (
    <>
      <h1>Identidades</h1>
      <p className="sub">
        Quem existe e assina. O modelo é efémero; o cargo que ele ocupa é durável.
      </p>

      <div className="stats">
        <div className="stat"><b>{conta("person")}</b><span>pessoas</span></div>
        <div className="stat"><b>{conta("office")}</b><span>cargos</span></div>
        <div className="stat"><b>{conta("app")}</b><span>apps</span></div>
      </div>

      <div className="card">
        <form action={criar}>
          <div className="row">
            <div style={{ maxWidth: 130 }}>
              <label>Tipo</label>
              <select name="kind" defaultValue="office">
                <option value="person">pessoa</option>
                <option value="office">cargo</option>
                <option value="app">app</option>
              </select>
            </div>
            <div><label>Nome</label><input name="name" required /></div>
            <div style={{ flex: 2 }}>
              <label>Mandato — o que este cargo pode fazer</label>
              <input name="mandate" placeholder="opcional por agora" />
            </div>
            <div style={{ flex: "0 0 auto" }}><button type="submit">Criar</button></div>
          </div>
        </form>
        {error && <p className="erro">{error.message}</p>}
      </div>

      {lista.length === 0 ? (
        <p className="vazio">Nenhuma identidade ainda.</p>
      ) : (
        <div className="card">
          <table>
            <thead><tr>
              <th>Tipo</th><th>Nome</th><th>Mandato</th><th>Criada</th><th>Id</th>
            </tr></thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id}>
                  <td><span className={"pill " + (i.kind === "office" ? "ok" : "dim")}>{i.kind}</span></td>
                  <td>{i.name}</td>
                  <td style={{ color: i.mandate ? undefined : "var(--dim)" }}>
                    {i.mandate ?? "sem mandato escrito"}
                  </td>
                  <td className="mono">{i.created_at.slice(0, 10)}</td>
                  <td className="mono" style={{ color: "var(--dim)" }}>{i.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
