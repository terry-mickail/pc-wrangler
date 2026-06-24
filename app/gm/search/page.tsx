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
  plum: "#9B7BD4",
};

type Campaign = { id: string; name: string };
type Entry = { id: string; type: string; title: string; body: string | null; visibility: string; tags: string[] };
type Char = { id: string; name: string; kind: string; description: string | null; tags: string[] };
type Sess = { id: string; session_number: number | null; status: string; notes: string | null };
type Link = { id: string; source_type: string; source_id: string; target_type: string; target_id: string; relation: string | null };

const TYPE_LABEL: Record<string, string> = { note: "Note", location: "Location", lore: "Lore" };

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [chars, setChars] = useState<Char[]>([]);
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [q, setQ] = useState<string>("");
  const [pc, setPc] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("campaigns").select("id, name").order("created_at");
      const list = (data as Campaign[]) || [];
      setCampaigns(list);
      if (list.length) setCampaignId(list[0].id);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    (async () => {
      const [{ data: e }, { data: c }, { data: s }, { data: l }] = await Promise.all([
        supabase.from("entries").select("id, type, title, body, visibility, tags").eq("campaign_id", campaignId),
        supabase.from("characters").select("id, name, kind, description, tags").eq("campaign_id", campaignId),
        supabase.from("sessions").select("id, session_number, status, notes").eq("campaign_id", campaignId),
        supabase.from("entity_links").select("id, source_type, source_id, target_type, target_id, relation").eq("campaign_id", campaignId),
      ]);
      if (!active) return;
      setEntries((e as Entry[]) || []);
      setChars((c as Char[]) || []);
      setSessions((s as Sess[]) || []);
      setLinks((l as Link[]) || []);
    })();
    return () => { active = false; };
  }, [campaignId, supabase]);

  const labelOf = (type: string, id: string): string => {
    if (type === "character") {
      const c = chars.find((x) => x.id === id);
      return c ? `${c.kind === "pc" ? "PC" : "NPC"} ${c.name}` : "character";
    }
    const e = entries.find((x) => x.id === id);
    return e ? `${TYPE_LABEL[e.type] || e.type} ${e.title}` : "entry";
  };

  const connectionsOf = (type: string, id: string): string[] => {
    const out: string[] = [];
    for (const l of links) {
      if (l.source_type === type && l.source_id === id) out.push(labelOf(l.target_type, l.target_id));
      else if (l.target_type === type && l.target_id === id) out.push(labelOf(l.source_type, l.source_id));
    }
    return out;
  };

  const linkedToPc = (type: string, id: string): boolean => {
    if (!pc) return true;
    return links.some(
      (l) =>
        (l.source_type === type && l.source_id === id && l.target_type === "character" && l.target_id === pc) ||
        (l.target_type === type && l.target_id === id && l.source_type === "character" && l.source_id === pc),
    );
  };

  const ql = q.trim().toLowerCase();
  const hit = (s: string | null): boolean => !!s && s.toLowerCase().includes(ql);

  const eHits = !ql && !pc ? [] : entries.filter((e) => (!ql || hit(e.title) || hit(e.body) || e.tags.some((t) => t.toLowerCase().includes(ql))) && linkedToPc("entry", e.id));
  const cHits = !ql && !pc ? [] : chars.filter((c) => (!ql || hit(c.name) || hit(c.description) || c.tags.some((t) => t.toLowerCase().includes(ql))) && linkedToPc("character", c.id));
  const sHits = pc || !ql ? [] : sessions.filter((s) => hit(s.notes) || String(s.session_number ?? "") === ql);

  const snippet = (body: string | null): string => {
    if (!body) return "";
    if (!ql) return body.slice(0, 140);
    const i = body.toLowerCase().indexOf(ql);
    if (i < 0) return body.slice(0, 140);
    const start = Math.max(0, i - 50);
    return (start > 0 ? "…" : "") + body.slice(start, start + 140);
  };

  const pcs = chars.filter((c) => c.kind === "pc");
  const box = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 } as const;
  const input = { width: "100%", boxSizing: "border-box" as const, background: C.surface2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 9, padding: "11px 13px", fontSize: 15, outline: "none" };

  const Chips = ({ items }: { items: string[] }) =>
    items.length === 0 ? null : (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {items.map((t, i) => (
          <span key={i} style={{ fontSize: 11, color: C.plum, background: "rgba(155,123,212,0.14)", border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 9px" }}>{t}</span>
        ))}
      </div>
    );

  const total = eHits.length + cHits.length + sHits.length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px 60px" }}>
        <WranglerNav />
        <h1 style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 28, margin: "8px 0 4px" }}>Search</h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 18px" }}>
          That time in Middlebrook with the librarian and Bobble, a few keystrokes away.
        </p>

        <div style={{ ...box, marginBottom: 16 }}>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={{ ...input, marginBottom: 12 }}>
            {campaigns.length === 0 && <option value="">No campaigns yet</option>}
            {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, lore, places, cast, session logs…" style={{ ...input, marginBottom: 12 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Involving:</span>
            <select value={pc} onChange={(e) => setPc(e.target.value)} style={{ ...input, width: "auto", flex: "0 1 200px", padding: "8px 10px", fontSize: 13 }}>
              <option value="">any PC</option>
              {pcs.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {pc && <span style={{ fontSize: 11, color: C.muted }}>(showing only things linked to this PC)</span>}
          </div>
        </div>

        {(ql || pc) && (
          <div style={{ color: C.muted, fontSize: 13, margin: "0 0 12px" }}>{total} result{total === 1 ? "" : "s"}</div>
        )}

        {cHits.length > 0 && (
          <div style={{ ...box, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em", marginBottom: 10 }}>CAST</div>
            <div style={{ display: "grid", gap: 10 }}>
              {cHits.map((c) => (
                <div key={c.id} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name} <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>· {c.kind === "pc" ? "PC" : "NPC"}</span></div>
                  {c.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{snippet(c.description)}</div>}
                  <Chips items={connectionsOf("character", c.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {eHits.length > 0 && (
          <div style={{ ...box, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em", marginBottom: 10 }}>NOTES · LORE · PLACES</div>
            <div style={{ display: "grid", gap: 10 }}>
              {eHits.map((e) => (
                <div key={e.id} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title} <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>· {TYPE_LABEL[e.type] || e.type}</span></div>
                  {e.body && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{snippet(e.body)}</div>}
                  <Chips items={connectionsOf("entry", e.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {sHits.length > 0 && (
          <div style={{ ...box, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "ui-monospace, monospace", letterSpacing: "0.1em", marginBottom: 10 }}>SESSION LOGS</div>
            <div style={{ display: "grid", gap: 10 }}>
              {sHits.map((s) => (
                <div key={s.id} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Session {s.session_number ?? "?"} <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>· {s.status}</span></div>
                  {s.notes && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{snippet(s.notes)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(ql || pc) && total === 0 && (
          <div style={{ ...box, color: C.muted, fontSize: 14 }}>Nothing matched. Try fewer or different words.</div>
        )}
        {!ql && !pc && (
          <div style={{ ...box, color: C.muted, fontSize: 14 }}>Type a name, place, or phrase, or pick a PC to see everything tied to them.</div>
        )}
      </div>
    </div>
  );
}
