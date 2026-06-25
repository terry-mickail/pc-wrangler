import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. Never import this
// into client components: the service role bypasses RLS. It is used by the
// transcription route handlers, which run on the server, to read audio,
// write transcript segments, and advance capture jobs.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
