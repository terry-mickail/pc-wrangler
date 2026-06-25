"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WranglerNav from "@/components/wrangler-nav";

const C = {
  bg: "#1B1426", surface: "#251B33", surface2: "#2F2340", line: "#3D2F52",
  text: "#F4EEFA", muted: "#A597BD", sun: "#F4C430", plum: "#9B7BD4", warn: "#E07A5F", good: "#5DBE9A",
};

const AXIS: Record<string, { label: string; color: string }> = {
  N: { label: "Character", color: "#B7615A" },
  T: { label: "Encounter", color: "#C8A24B" },
  O: { label: "System", color: "#4E8077" },
  S: { label: "Table", color: "#CE8A42" },
  E: { label: "World", color: "#6C76B0" },
  I: { label: "Presence", color: "#9A93B0" },
};

type Campaign = { id: string; name: string };
type PE = { status: string; event_type: string; axis: string | null; confidence: number | null; extractor_version: string | null };
type Group = { k: string; n: number; rate: number };

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const rateColor = (r: number): string => (r >= 0.7 ? "#5DBE9A" : r >= 0.4 ? "#F4C430" : "#E07A5F");

export default function ReliabilityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<PE[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const [{ data: camps }, { data: ets }] = await Promise.all([
        supabase.from("campaigns").select("id, name").order("created_at", { ascending: true }),
        supabase.from("event_types").select("key, label"),
      ]);
      const list = (camps as Campaign[]) || [];
      setCampaigns(list);
      const lab: Record<string, string> = {};
      ((ets as { key: string; label: string }[]) || []).forEach((e) => { lab[e.key] = e.label; });
      setLabels(lab);
      if (list.length) setCampaignId(list[0].id);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("proposed_events")
        .select("status, event_type, axis, confidence, extractor_version")
        .eq("campaign_id", campaignId);
      if (!active) return;
      setRows((data as PE[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [campaignId, supabase]);

  const stats = useMemo(() => {
    const reviewed = rows.filter((r) => r.status === "accepted" || r.status === "rejected");
    const accepted = reviewed.filter((r) => r.status === "accepted").length;
    const pending = rows.filter((r) => r.status === "proposed").length;
    const acceptRate = reviewed.length ? accepted / reviewed.length : 0;

    const bucketDefs: [number, number][] = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]];
    const calib = bucketDefs.map(([lo, hi]) => {
      const inb = reviewed.filter((r) => { const c = (r.confidence ?? 0) * 100; return c >= lo && c < hi; });
      const acc = inb.filter((r) => r.status === "accepted").length;
      return { lo, hi: Math.min(hi, 100), n: inb.length, rate: inb.length ? acc / inb.length : 0, mid: (lo + Math.min(hi, 100)) / 2 / 100 };
    });

    const byGroup = (keyFn: (r: PE) => string | null): Group[] => {
      const m = new Map<string, { n: number; acc: number }>();
      reviewed.forEach((r) => {
        const k = keyFn(r);
        if (!k) return;
        const e = m.get(k) || { n: 0, acc: 0 };
        e.n += 1;
        if (r.status === "accepted") e.acc += 1;
        m.set(k, e);
      });
      return Array.from(m.entries()).map(([k, v]) => ({ k, n: v.n, rate: v.acc / v.n })).sort((a, b) => b.n - a.n);
    };

    return {
      reviewed: reviewed.length, accepted, pending, acceptRate, calib,
      byType: byGroup((r) => r.event_type),
      byAxis: byGroup((r) => r.axis),
      byVer: byGroup((r) => r.extractor_version),
    };
  }, [rows]);

  const box = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 18 } as const;

  const Bar = ({ rate }: { rate: number }) => (
    <div style={{ flex: 1, height: 8, background: C.surface2, borderRadius: 8, overflow: "hidden", minWidth: 60 }}>
      <div style={{ height: "100%", width: pct(rate), background: rateColor(rate) }} />
    </div>
  );

  const Row = ({ label, chip, n, rate }: { label: string; chip?: string; n: number; rate: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 150, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
        {chip && <span style={{ width: 9, height: 9, borderRadius: 9, background: chip, flexShrink: 0 }} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      <Bar rate={rate} />
      <div style={{ width: 78, textAlign: "right", fontSize: 13 }}>
        <span style={{ color: rateColor(rate), fontWeight: 700 }}>{pct(rate)}</span>
        <span style={{ color: C.muted }}> · {n}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px 60px" }}>
        <WranglerNav />

        <h1 style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 28, margin: "8px 0 4px" }}>Reliability</h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 20px" }}>
          How well the extractor codes, measured by your accept and reject decisions. This is precision and calibration, not recall: agreement statistics arrive with double-coding.
        </p>

        <div style={box}>
          <label style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em" }}>CAMPAIGN</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, background: C.surface2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px", fontSize: 15 }}>
            {campaigns.length === 0 && <option value="">No campaigns yet</option>}
            {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        {loading ? (
          <div style={{ ...box, color: C.muted, fontSize: 14 }}>Loading…</div>
        ) : stats.reviewed === 0 ? (
          <div style={{ ...box, color: C.muted, fontSize: 14 }}>
            No reviewed proposals yet. As you accept and reject in the Review queue, this fills in.
            {stats.pending > 0 && <> There {stats.pending === 1 ? "is" : "are"} {stats.pending} awaiting review.</>}
          </div>
        ) : (
          <>
            {/* headline */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={{ ...box, marginBottom: 0, textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: rateColor(stats.acceptRate) }}>{pct(stats.acceptRate)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>accept rate (precision)</div>
              </div>
              <div style={{ ...box, marginBottom: 0, textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{stats.reviewed}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>reviewed ({stats.accepted} accepted)</div>
              </div>
              <div style={{ ...box, marginBottom: 0, textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.sun }}>{stats.pending}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>still awaiting review</div>
              </div>
            </div>

            {/* calibration */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Calibration</div>
              <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16 }}>
                Is the extractor&apos;s confidence honest? In a well-calibrated model, the accept rate in each band lands near the band itself. A large gap means the confidence is over- or under-stated there.
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {stats.calib.map((b) => {
                  const delta = b.n ? b.rate - b.mid : 0;
                  return (
                    <div key={b.lo} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 150, fontSize: 13, color: C.muted, fontFamily: "ui-monospace, monospace" }}>conf {b.lo}-{b.hi}%</div>
                      <Bar rate={b.rate} />
                      <div style={{ width: 120, textAlign: "right", fontSize: 13 }}>
                        {b.n === 0 ? <span style={{ color: C.muted }}>no data</span> : (
                          <>
                            <span style={{ color: rateColor(b.rate), fontWeight: 700 }}>{pct(b.rate)}</span>
                            <span style={{ color: C.muted }}> · {b.n}</span>
                            <span style={{ color: Math.abs(delta) <= 0.15 ? C.good : C.warn, fontSize: 11, marginLeft: 6 }}>
                              {delta >= 0 ? "+" : ""}{Math.round(delta * 100)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* by event type */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Accept rate by event type</div>
              <div style={{ display: "grid", gap: 12 }}>
                {stats.byType.map((g) => (<Row key={g.k} label={labels[g.k] || g.k} n={g.n} rate={g.rate} />))}
              </div>
            </div>

            {/* by axis */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Accept rate by axis</div>
              <div style={{ display: "grid", gap: 12 }}>
                {stats.byAxis.map((g) => (<Row key={g.k} label={AXIS[g.k]?.label || g.k} chip={AXIS[g.k]?.color} n={g.n} rate={g.rate} />))}
              </div>
            </div>

            {/* by version */}
            <div style={box}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Accept rate by extractor version</div>
              <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 16 }}>When you revise the prompt or model, the version string changes, so you can see whether reliability moved.</div>
              <div style={{ display: "grid", gap: 12 }}>
                {stats.byVer.map((g) => (<Row key={g.k} label={g.k} n={g.n} rate={g.rate} />))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
