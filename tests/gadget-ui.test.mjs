import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Platform UI reads and edits the same canonical hello-agentic draft", async () => {
  const actions = await readFile(new URL("../app/gadgets/hello-agentic/actions.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/gadgets/hello-agentic/page.tsx", import.meta.url), "utf8");

  assert.match(actions, /powerfarm_gadget_get_draft/);
  assert.match(actions, /powerfarm_gadget_apply_patch/);
  assert.match(actions, /p_base_revision/);
  assert.match(actions, /p_client_operation_id/);
  assert.match(actions, /revision_conflict/);
  assert.doesNotMatch(actions, /service.role|service_role/i);
  assert.match(page, /gadget\.yaml/);
  assert.match(page, /draft_revision/);
});
