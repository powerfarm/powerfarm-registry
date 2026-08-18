import { supabaseServer } from "./supabase-server";

// As prateleiras. Estao todas declaradas mesmo quando vazias: o vazio e honesto
// e diz que nada aparece aqui so por ter sido gerado.
export const PRATELEIRAS = [
  { kind: "brand",  titulo: "Marca",      nota: "Símbolo, wordmark, cor, tipografia." },
  { kind: "store",  titulo: "Componentes", nota: "Login, notificações, onboarding, instaláveis." },
  { kind: "agent",  titulo: "Agentes",    nota: "Definições que ocupam cargos." },
  { kind: "policy", titulo: "Políticas",  nota: "Mandato: quem pode o quê." },
  { kind: "prompt", titulo: "Prompts",    nota: "Texto versionado que dirige um agente." },
  { kind: "schema", titulo: "Esquemas",   nota: "Formatos que outros sistemas obedecem." },
] as const;

export type Versao = {
  artifact_id: string; version: string; status: string;
  source_repo: string | null; source_commit: string | null; source_path: string | null;
  sha256: string | null; media_type: string | null; size_bytes: number | null;
  notes: string | null; created_at: string;
};

export type Artefacto = {
  id: string; kind: string; title: string; summary: string | null;
  created_at: string;
  artifact_versions: Versao[];
};

/** A versao que a PowerFarm reconhece agora. Null quando nenhuma foi aprovada. */
export function aprovada(a: Artefacto): Versao | null {
  return a.artifact_versions.find((v) => v.status === "approved") ?? null;
}

/** Permalink do commit exato. E a evidencia, nao detrito de implementacao. */
export function permalink(v: Versao): string | null {
  if (!v.source_repo || !v.source_commit || !v.source_path) return null;
  return `https://github.com/${v.source_repo}/blob/${v.source_commit}/${v.source_path}`;
}

export async function lerArtefactos(): Promise<Artefacto[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("artifacts")
    .select("id, kind, title, summary, created_at, artifact_versions(*)")
    .order("id");
  return (data ?? []) as Artefacto[];
}

export async function lerArtefacto(id: string): Promise<Artefacto | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("artifacts")
    .select("id, kind, title, summary, created_at, artifact_versions(*)")
    .eq("id", id).maybeSingle();
  return (data as Artefacto) ?? null;
}

export async function lerRelacoes(id: string) {
  const supabase = await supabaseServer();
  const [dele, paraEle] = await Promise.all([
    supabase.from("artifact_relations").select("*").eq("from_artifact", id),
    supabase.from("artifact_relations").select("*").eq("to_artifact", id),
  ]);
  return { dele: dele.data ?? [], paraEle: paraEle.data ?? [] };
}
