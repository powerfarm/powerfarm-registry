-- Powerfarm v0.1 — follow-up from the post-migration Supabase advisors.
-- No runtime table or authority topology changes here.

-- This helper only reads the caller's own visible identity link. Invoker mode
-- is sufficient and avoids exposing a SECURITY DEFINER RPC to signed-in users.
alter function public.identidade_atual() security invoker;

-- The primary key starts with app_name, so it does not cover the ownership FK.
create index adk_sessions_user on adk.sessions (user_id);
