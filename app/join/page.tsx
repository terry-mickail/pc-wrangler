"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#1B1426", surface: "#251B33", line: "#3D2F52",
  text: "#F4EEFA", muted: "#A597BD", sun: "#F4C430", plum: "#9B7BD4", warn: "#E07A5F",
};

export default function JoinPage() {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<"working" | "invalid" | "done">("working");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      const code = new URLSearchParams(window.location.search).get("c");
      if (!code) { if (active) setStatus("invalid"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) { if (active) setStatus("invalid"); return; }
      }

      const { data, error } = await supabase.rpc("claim_character_invite", { p_code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.campaign_share_code) { if (active) setStatus("invalid"); return; }

      if (active) { setName(row.character_name || ""); setStatus("done"); }
      window.location.replace(`/play?share=${encodeURIComponent(row.campaign_share_code)}`);
    })();
    return () => { active = false; };
  }, [supabase]);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: "32px 28px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        {status === "working" && (
          <>
            <div style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 22, color: C.sun }}>
              Joining the table…
            </div>
            <p style={{ color: C.muted, marginTop: 12, fontSize: 15 }}>Binding your character to this link.</p>
          </>
        )}
        {status === "done" && (
          <>
            <div style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 22, color: C.plum }}>
              Welcome{name ? `, ${name}` : ""}.
            </div>
            <p style={{ color: C.muted, marginTop: 12, fontSize: 15 }}>Taking you to your inventory…</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <div style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 22, color: C.warn }}>
              This invite link isn’t valid.
            </div>
            <p style={{ color: C.muted, marginTop: 12, fontSize: 15 }}>
              Ask your GM to resend your personal link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
