import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient(url: string, publishableKey: string) {
  browserClient ??= createBrowserClient(url, publishableKey, {
    auth: { experimental: { passkey: true } },
  });
  return browserClient;
}
