import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// After the player uploads via the signed URL, register the track (so the
// transcription worker will pick it up) and record self-consent.
export async function POST(req: NextRequest) {
  let share: string | undefined; let characterId: string | undefined; let path: string | undefined; let durationSeconds: number | undefined;
  try { const b = await req.json(); share = b?.share; characterId = b?.characterId; path = b?.path; durationSeconds = b?.durationSeconds; } catch { /* guard below */ }
  if (!share || !characterId || !path) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: camp } = await admin.from("campaigns").select("id").eq("share_code", share).single();
  if (!camp) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (!path.startsWith(`${camp.id}/`)) return NextResponse.json({ error: "Bad path" }, { status: 400 });

  const { data: ch } = await admin.from("characters").select("id").eq("id", characterId).eq("campaign_id", camp.id).eq("kind", "pc").single();
  if (!ch) return NextResponse.json({ error: "Unknown character" }, { status: 400 });

  // Prefer the open draft job; fall back to the latest job for the campaign.
  let job = (await admin.from("capture_jobs").select("id, session_id").eq("campaign_id", camp.id).eq("status", "draft").order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
  if (!job) job = (await admin.from("capture_jobs").select("id, session_id").eq("campaign_id", camp.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data;
  if (!job) return NextResponse.json({ error: "No capture job to attach to." }, { status: 409 });

  const dur = typeof durationSeconds === "number" && durationSeconds > 0 ? Math.round(durationSeconds) : null;
  const { error: insErr } = await admin.from("audio_tracks").insert({ job_id: job.id, campaign_id: camp.id, character_id: characterId, storage_path: path, duration_seconds: dur, status: "pending" });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await admin.from("recording_consents").upsert(
    { session_id: job.session_id, campaign_id: camp.id, character_id: characterId, consented: true, method: "self_recording" },
    { onConflict: "session_id,character_id" },
  );

  return NextResponse.json({ ok: true });
}
