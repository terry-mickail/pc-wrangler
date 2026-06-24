import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google (PKCE) sends the user back here with a ?code=...
// We exchange it for a session cookie, then send them on to the workspace.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/gm";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // code missing or exchange failed
  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
