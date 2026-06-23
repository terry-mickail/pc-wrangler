"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const C = {
  ink: "#15131E", panel: "#211D30", line: "#332C46", vellum: "#ECE3CF",
  muted: "#8B85A0", brass: "#C8A24B", brassDim: "#8A7335", accent: "#6C76B0",
  good: "#5E8C7E", warn: "#A8493E",
};
const box = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 };
const btn = { background: C.brass, color: C.ink, border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const btnGhost = { background: "none", color: C.brass, border: `1px solid ${C.brassDim}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer" };
const inputStyle = { background: C.ink, color: C.vellum, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px", fontSize: 14 };
const head = { fontSize: 13, color: C.muted, marginBottom: 12 };

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [equity, setEquity] = useState<any[]>([]);
  const [spotlight, setSpotlight] = useState<any[]>([]);
  const [arcs, setArcs] = useState<any[]>([]);
  const [loot, setLoot] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setErr("Please sign in to view the dashboard."); setLoading(false); } return; }
      const { data: camps } = await supabase.from("campaigns").select("id,name,system").order("created_at", { ascending: false });
      if (!active) return;
      setCampaigns(camps || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  const loadCampaign = useCallback(async (id: string) => {
    setErr(null);
    const [sess, eq, sp, ar, lt] = await Promise.all([
      supabase.from("sessions").select("id,session_number,status").eq("campaign_id", id).order("session_number", { ascending: false, nullsFirst: false }),
      supabase.from("v_session_equity").select("*").eq("campaign_id", id),
      supabase.from("v_session_spotlight").select("*").eq("campaign_id", id),
      supabase.from("v_arc_freshness").select("*").eq("campaign_id", id),
      supabase.from("v_loot_fairness").select("*").eq("campaign_id", id),
    ]);
    if (sess.error || eq.error || sp.error || ar.error || lt.error) {
      setErr((sess.error || eq.error || sp.error || ar.error || lt.error)?.message || "Load error");
    }
    const sessRows = sess.data || [];
    setSessions(sessRows);
    setEquity(eq.data || []);
    setSpotlight(sp.data || []);
    setArcs(ar.data || []);
    setLoot(lt.data || []);
    setSelectedSession((sessRows[0] && sessRows[0].id) || null);
  }, [supabase]);

  useEffect(() => { if (campaign) loadCampaign(campaign); }, [campaign, loadCampaign]);

  const numById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sessions) if (s.session_number != null) m[s.id] = s.session_number;
    return m;
  }, [sessions]);

  const equityTrend = useMemo(() => {
    return equity
      .map((e) => ({ session: numById[e.session_id] ?? 0, cv: e.cv, n: e.n_active }))
      .filter((r) => r.session > 0)
      .sort((a, b) => a.session - b.session);
  }, [equity, numById]);

  const spotlightRows = useMemo(() => {
    return spotlight
      .filter((s) => s.session_id === selectedSession)
      .sort((a, b) => (b.share || 0) - (a.share || 0));
  }, [spotlight, selectedSession]);

  const arcRows = useMemo(() => {
    return [...arcs].sort((a, b) => (b.stale ? 1 : 0) - (a.stale ? 1 : 0) || (b.sessions_since_touched || 0) - (a.sessions_since_touched || 0));
  }, [arcs]);

  const lootRows = useMemo(() => {
    return [...loot].sort((a, b) => (b.total_value || 0) - (a.total_value || 0));
  }, [loot]);

  if (loading) return <Shell><p style={{ color: C.muted }}>Loading...</p></Shell>;

  return (
    <Shell>
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", color: C.brass, textTransform: "uppercase", marginBottom: 18 }}>
        Dashboard
      </div>
      {err && <div style={{ ...box, borderColor: C.warn, color: "#E7B7B0", fontSize: 13 }}>{err}</div>}

      {/* campaign picker */}
      <div style={box}>
        <div style={head}>Campaign</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {campaigns.length === 0 && <span style={{ color: C.muted, fontSize: 13 }}>No campaigns yet.</span>}
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => setCampaign(c.id)} style={campaign === c.id ? btn : btnGhost}>{c.name}</button>
          ))}
        </div>
      </div>

      {campaign && (
        <>
          {/* equity trend */}
          <div style={box}>
            <div style={head}>Spotlight evenness across sessions (lower is more even)</div>
            {equityTrend.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>No session data yet. Log some events to populate this.</p>
            ) : (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityTrend} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
                    <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                    <XAxis dataKey="session" stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} label={{ value: "session", position: "insideBottom", offset: -2, fill: C.muted, fontSize: 11 }} />
                    <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, color: C.vellum }} />
                    <Line type="monotone" dataKey="cv" stroke={C.brass} strokeWidth={2} dot={{ fill: C.brass, r: 3 }} name="dispersion (CV)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* per-session spotlight */}
          <div style={box}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: C.muted }}>Spotlight share by character</div>
              <select style={inputStyle} value={selectedSession || ""} onChange={(e) => setSelectedSession(e.target.value || null)}>
                {sessions.map((s) => <option key={s.id} value={s.id}>Session #{s.session_number ?? "?"}</option>)}
              </select>
            </div>
            {spotlightRows.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>No spotlight data for this session.</p>
            ) : (
              spotlightRows.map((r) => (
                <div key={r.character_id || r.character_name} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{r.character_name || "— table —"}</span>
                    <span className="mono" style={{ color: C.muted }}>{Math.round((r.share || 0) * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.line, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(r.share || 0) * 100}%`, height: "100%", background: C.accent }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* stale arcs */}
          <div style={box}>
            <div style={head}>Character arcs</div>
            {arcRows.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>No arcs tracked yet.</p>
            ) : (
              arcRows.map((a) => (
                <div key={a.arc_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 13 }}>
                    {a.stale && <span style={{ color: C.warn, marginRight: 8 }}>●</span>}
                    <span style={{ fontWeight: 600 }}>{a.title}</span>
                    {a.character_name && <span style={{ color: C.muted }}>{"  "}· {a.character_name}</span>}
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: a.stale ? C.warn : C.muted }}>
                    {a.sessions_since_touched == null ? "—" : `${a.sessions_since_touched} sess ago`}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* loot fairness */}
          <div style={box}>
            <div style={head}>Loot distribution (deviation from even split)</div>
            {lootRows.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>No loot recorded yet.</p>
            ) : (
              lootRows.map((r) => {
                const dev = r.deviation || 0;
                return (
                  <div key={r.character_id || r.character_name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{r.character_name || "—"}</span>
                      <span className="mono" style={{ color: C.muted }}>
                        {Math.round((r.share || 0) * 100)}% · {dev >= 0 ? "+" : ""}{Math.round(dev * 100)}%
                      </span>
                    </div>
                    {/* center line at 0; bar grows left (under) or right (over) */}
                    <div style={{ position: "relative", height: 6, background: C.line, borderRadius: 4 }}>
                      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.muted }} />
                      <div style={{
                        position: "absolute", top: 0, height: "100%", borderRadius: 4,
                        background: dev >= 0 ? C.good : C.warn,
                        left: dev >= 0 ? "50%" : `${50 + dev * 100}%`,
                        width: `${Math.min(Math.abs(dev) * 100, 50)}%`,
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.ink, color: C.vellum, minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;}`}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>{children}</div>
    </div>
  );
}
