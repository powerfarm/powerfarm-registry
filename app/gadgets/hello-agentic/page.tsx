import { getHelloDraft, saveHelloDraft } from "./actions";

export const dynamic = "force-dynamic";

export default async function HelloAgentic({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ error, saved }, draft] = await Promise.all([searchParams, getHelloDraft()]);
  const source = draft.authored_state.files?.["gadget.yaml"] ?? "";

  return (
    <>
      <p className="migalha">Gadgets · Agentic</p>
      <h1>hello-agentic</h1>
      <p className="sub">
        O draft mutável canónico. A Platform UI e a capability do Workspace leem e
        editam este mesmo estado no Registry; revisões publicadas permanecem imutáveis.
      </p>

      <div className="card evidencia">
        <div className="linha"><span>Draft revision</span><b className="mono">{draft.draft_revision}</b></div>
        <div className="linha"><span>Published revision</span><b className="mono">{draft.published_revision ?? "—"}</b></div>
        <div className="linha"><span>Content hash</span><b className="mono">sha256:{draft.content_hash}</b></div>
      </div>

      {error === "revision_conflict" && (
        <p className="erro">O draft mudou entretanto. A versão atual foi recarregada; reconcilie antes de guardar.</p>
      )}
      {error === "invalid_edit" && <p className="erro">A edição está vazia ou tem uma revisão inválida.</p>}
      {error === "save_failed" && <p className="erro">O Registry recusou a edição.</p>}
      {saved === "1" && <p className="sucesso">Draft guardado no Registry.</p>}

      <form action={saveHelloDraft} className="card gadget-editor">
        <input type="hidden" name="baseRevision" value={draft.draft_revision} />
        <label htmlFor="gadget-source">gadget.yaml</label>
        <textarea id="gadget-source" name="source" defaultValue={source} spellCheck={false} />
        <div className="editor-actions">
          <button type="submit">Guardar draft</button>
          <span>optimistic base revision {draft.draft_revision}</span>
        </div>
      </form>

      <p className="sub">
        Publicação é uma ação separada: a capability Powerfarm valida esta fonte no Engine
        privado e só então pede ao Registry uma revisão imutável.
      </p>
    </>
  );
}
