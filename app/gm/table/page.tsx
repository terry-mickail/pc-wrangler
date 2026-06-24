"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WranglerNav from "@/components/wrangler-nav";

const C = {
  bg: "#1B1426",
  surface: "#251B33",
  surface2: "#2F2340",
  line: "#3D2F52",
  text: "#F4EEFA",
  muted: "#A597BD",
  sun: "#F4C430",
  sunSoft: "#FFD75E",
  plum: "#9B7BD4",
  warn: "#E07A5F",
  good: "#5DBE9A",
};

type Campaign = { id: string; name: string; share_code: string };
type Sess = { id: string; session_number: number | null; status: string };
type Char = { id: string; name: string; class: string | null };
type Vibe = {
  id: string;
  player_name: string | null;
  satisfaction: number | null;
  spotlight_feeling: string | null;
  note: string | null;
};

const STATUSES: { v: string; l: string }[] = [
  { v: "present", l: "Present" },
  { v: "late", l: "Late" },
  { v: "partial", l: "Partial" },
  { v: "absent", l: "Absent" },
];

const SPOTLIGHT_LABEL: Record<string, string> = {
  wanted_more: "Wanted more spotlight",
  about_right: "Felt about right",
  wanted_less: "Wanted less spotlight",
};

export default function CheckInPage() {
  const supabase = useMemo(() => createClient(), []);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [chars, setChars] = useState<Char[]>([]);
  const [selected, setSelected] = useState<Sess | null>(null);
  const [att, setAtt] = useState<Record<string, string>>({});
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const campaign = campaigns.find((c) => c.id === campaignId) || null;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, share_code")
        .order("created_at", { ascending: true });
      const list = (data as Campaign[]) || [];
      setCampaigns(list);
      if (list.length) setCampaignId(list[0].id);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    (async () => {
      const [{ data: sess }, { data: ch }] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, session_number, status")
          .eq("campaign_id", campaignId)
          .order("session_number", { ascending: false }),
        supabase
          .from("characters")
          .select("id, name, class")
          .eq("campaign_id", campaignId)
          .eq("kind", "pc")
          .order("name", { ascending: true }),
      ]);
      if (!active) return;
      const sList = (sess as Sess[]) || [];
      setSessions(sList);
      setChars((ch as Char[]) || []);
      setSelected(sList.length ? sList[0] : null);
    })();
    return () => {
      active = false;
    };
  }, [campaignId, supabase]);

  useEffect(() => {
    if (!selected) {
      setAtt({});
      setVibes([]);
      return;
    }
    let active = true;
    (async () => {
      const [{ data: aRows }, { data: vRows }] = await Promise.all([
        supabase.from("attendance").select("character_id, status").eq("session_id", selected.id),
        supabase
          .from("vibe_checks")
          .select("id, player_name, satisfaction, spotlight_feeling, note")
          .eq("session_id", selected.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      const map: Record<string, string> = {};
      ((aRows as { character_id: string | null; status: string }[]) || []).forEach((r) => {
        if (r.character_id) map[r.character_id] = r.status;
      });
      setAtt(map);
      setVibes((vRows as Vibe[]) || []);
    })();
    return () => {
      active = false;
    };
  }, [selected, supabase]);

  async function mark(charId: string, status: string) {
    if (!selected || !campaignId) return;
    setAtt((prev) => ({ ...prev, [charId]: status }));
    await supabase
      .from("attendance")
      .upsert(
        { campaign_id: campaignId, session_id: selected.id, character_id: charId, status },
        { onConflict: "session_id,character_id" },
      );
  }

  function vibeLink(): string {
    if (!campaign || !selected || selected.session_number === null) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/vibe?share=${campaign.share_code}&s=${selected.session_number}`;
  }

  async function copyLink() {
    const link = vibeLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      /* clipboard blocked */
    }
  }

  const box = {
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    padding: 20,
  } as const;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 20px 60px" }}>
        <WranglerNav />

        <h1 style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 28, margin: "8px 0 4px" }}>
          Session check-in
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>
          Mark who was at the table, and read back how players felt. The vibe link is per session, send it after you wrap.
        </p>

        {/* campaign + session pickers */}
        <div style={{ ...box, marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}>
            CAMPAIGN
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              background: C.surface2,
              color: C.text,
              border: `1px solid ${C.line}`,
              borderRadius: 9,
              padding: "10px 12px",
              fontSize: 15,
            }}
          >
            {campaigns.length === 0 && <option value="">No campaigns yet</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {sessions.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em", margin: "16px 0 8px" }}>
                SESSION
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sessions.map((s) => {
                  const on = selected && selected.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: `1px solid ${on ? C.sun : C.line}`,
                        background: on ? C.sun : C.surface2,
                        color: on ? "#1B1426" : C.text,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Session {s.session_number ?? "?"}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {campaignId && sessions.length === 0 && (
            <p style={{ color: C.muted, fontSize: 13, marginTop: 14 }}>
              No sessions yet for this campaign. Create one in the Session Log first.
            </p>
          )}
        </div>

        {selected && (
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr", alignItems: "start" }}>
            {/* attendance */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Attendance</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
                Who was present for Session {selected.session_number ?? "?"}.
              </div>
              {chars.length === 0 && (
                <p style={{ color: C.muted, fontSize: 13 }}>No player characters in the roster yet.</p>
              )}
              <div style={{ display: "grid", gap: 10 }}>
                {chars.map((ch) => (
                  <div
                    key={ch.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 12px",
                      background: C.surface2,
                      border: `1px solid ${C.line}`,
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ch.name}</div>
                      {ch.class && <div style={{ fontSize: 12, color: C.muted }}>{ch.class}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {STATUSES.map((st) => {
                        const on = att[ch.id] === st.v;
                        const tone = st.v === "absent" ? C.warn : st.v === "present" ? C.good : C.plum;
                        return (
                          <button
                            key={st.v}
                            type="button"
                            onClick={() => mark(ch.id, st.v)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: `1px solid ${on ? tone : C.line}`,
                              background: on ? tone : "transparent",
                              color: on ? "#1B1426" : C.muted,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {st.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* vibe link */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Vibe check link</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
                Send this to your players after the session. They rate their own spotlight and fun, no login needed.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  readOnly
                  value={vibeLink()}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    background: C.surface2,
                    color: C.text,
                    border: `1px solid ${C.line}`,
                    borderRadius: 9,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    background: C.sun,
                    color: "#1B1426",
                    border: "none",
                    borderRadius: 9,
                    padding: "10px 18px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* vibe results */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                What players said {vibes.length > 0 ? `(${vibes.length})` : ""}
              </div>
              {vibes.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
                  No check-ins yet for this session.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {vibes.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: "12px 14px",
                        background: C.surface2,
                        border: `1px solid ${C.line}`,
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          {v.player_name || "Anonymous player"}
                        </span>
                        {v.satisfaction !== null && (
                          <span style={{ color: C.sun, fontSize: 13, fontWeight: 700 }}>{v.satisfaction}/5</span>
                        )}
                      </div>
                      {v.spotlight_feeling && (
                        <div style={{ fontSize: 13, color: C.plum, marginTop: 4 }}>
                          {SPOTLIGHT_LABEL[v.spotlight_feeling] || v.spotlight_feeling}
                        </div>
                      )}
                      {v.note && (
                        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                          “{v.note}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
