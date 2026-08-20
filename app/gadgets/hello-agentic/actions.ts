"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export type HelloDraft = {
  gadget_id: "hello-agentic";
  draft_revision: number;
  authored_state: { files?: { "gadget.yaml"?: string } };
  content_hash: string;
  published_revision: number | null;
};

export async function getHelloDraft(): Promise<HelloDraft> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("powerfarm_gadget_get_draft", {
    p_gadget_id: "hello-agentic",
  });
  if (error) throw new Error(`Unable to read hello-agentic draft: ${error.message}`);
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("hello-agentic draft is unavailable");
  }
  return data as unknown as HelloDraft;
}

export async function saveHelloDraft(formData: FormData): Promise<never> {
  const source = formData.get("source");
  const baseRevision = Number(formData.get("baseRevision"));
  if (typeof source !== "string" || source.length === 0 || !Number.isSafeInteger(baseRevision)) {
    redirect("/gadgets/hello-agentic?error=invalid_edit");
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("powerfarm_gadget_apply_patch", {
    p_gadget_id: "hello-agentic",
    p_base_revision: baseRevision,
    p_patch: { files: { "gadget.yaml": source } },
    p_client_operation_id: crypto.randomUUID(),
  });
  if (error) {
    const reason = error.message.includes("revision_conflict")
      ? "revision_conflict"
      : "save_failed";
    redirect(`/gadgets/hello-agentic?error=${reason}`);
  }

  revalidatePath("/gadgets/hello-agentic");
  redirect("/gadgets/hello-agentic?saved=1");
}
