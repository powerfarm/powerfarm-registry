import { NextResponse } from "next/server";
import { aprovada, lerArtefactos, permalink, PRATELEIRAS } from "@/lib/manifest";

// O gemeo legivel por maquina. Deriva dos MESMOS registos que a UI humana le —
// nao ha uma segunda base de dados que possa discordar da primeira.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const artefactos = await lerArtefactos();

  return NextResponse.json({
    registry: "powerfarm-identity",
    generated_at: new Date().toISOString(),
    shelves: PRATELEIRAS.map((p) => ({
      kind: p.kind, title: p.titulo, note: p.nota,
      count: artefactos.filter((a) => a.kind === p.kind).length,
    })),
    artifacts: artefactos.map((a) => {
      const v = aprovada(a);
      return {
        id: a.id,
        kind: a.kind,
        title: a.title,
        summary: a.summary,
        approved_version: v?.version ?? null,
        status: v?.status ?? null,
        source: v ? {
          repository: v.source_repo, commit: v.source_commit,
          path: v.source_path, permalink: permalink(v),
        } : null,
        artifact: v ? {
          sha256: v.sha256, media_type: v.media_type, size_bytes: v.size_bytes,
        } : null,
        // Honestidade: nao ha CLI. Nao anunciamos comandos que nao existem.
        install: null,
        uninstall: null,
        self: `${url.origin}/api/manifest/${a.id}`,
        human: `${url.origin}/store/${a.id}`,
      };
    }),
  });
}
