import { NextResponse } from "next/server";
import { aprovada, lerArtefacto, lerRelacoes, permalink } from "@/lib/manifest";

export async function GET(request: Request,
                          { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await lerArtefacto(decodeURIComponent(id));
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = new URL(request.url);
  const v = aprovada(a);
  const { dele, paraEle } = await lerRelacoes(a.id);

  return NextResponse.json({
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
    notes: v?.notes ?? null,
    // A historia nao se sobrescreve: cada versao que existiu continua listada.
    versions: a.artifact_versions.map((x) => ({
      version: x.version, status: x.status, sha256: x.sha256,
      source: { repository: x.source_repo, commit: x.source_commit, path: x.source_path },
      admitted_at: x.created_at,
    })),
    relations: {
      depends_on: dele.filter((r: any) => r.kind === "depends_on")
        .map((r: any) => ({ id: r.to_artifact, version: r.to_version })),
      replaces: dele.filter((r: any) => r.kind === "replaces")
        .map((r: any) => ({ id: r.to_artifact, version: r.to_version })),
      part_of: dele.filter((r: any) => r.kind === "part_of")
        .map((r: any) => ({ id: r.to_artifact, version: r.to_version })),
      referenced_by: paraEle.map((r: any) => ({ id: r.from_artifact, version: r.from_version })),
    },
    // Nao existe CLI. Dizer o contrario seria reivindicar o que nao se prova.
    install: null,
    uninstall: null,
    human: `${url.origin}/store/${a.id}`,
  });
}
