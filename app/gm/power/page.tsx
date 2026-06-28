"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* Wrangler — the Power Room.
   A standalone engine-room page. The DM throws the knife switch to bring the
   disposition engine to life. The switch is honest about state: it only latches
   while a fit is genuinely running, only flashes "alive" when the run row says
   done, and snaps to a fault when it errors. */

const C = {
  bg: "#140E1F", room: "#1B1426", stone: "#241A33", stone2: "#2D2140",
  line: "#3D2F52", text: "#F4EEFA", muted: "#A597BD",
  brass: "#C8A24B", brassDim: "#7A632E", copper: "#B5763A",
  spark: "#BFE3FF", sun: "#F4C430", plum: "#9B7BD4", warn: "#E07A5F", good: "#5DBE9A",
};

type Phase = "dormant" | "arming" | "animating" | "alive" | "fault";
type Campaign = { id: string; name: string };

const PULL_PX = 200;     // drag distance for a full throw
const COMMIT = 0.8;      // fraction past which the switch latches
const OPEN_DEG = -68;    // blade angle when open

export default function PowerRoomPage() {
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("dormant");
  const [pull, setPull] = useState(0);          // 0 = open (up), 1 = seated (down)
  const [fault, setFault] = useState<string>("");

  const runIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartY = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  /* ---- load campaigns, and resume a fit already in progress -------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("campaigns").select("id,name").order("created_at");
      const list = (data as Campaign[]) || [];
      setCampaigns(list);
      if (list.length && !campaignId) setCampaignId(list[0].id);
    })();
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    // If a fit is already running for this campaign, latch and resume.
    (async () => {
      const { data } = await supabase
        .from("disposition_runs")
        .select("id,status,created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1);
      const latest = (data as { id: string; status: string; created_at: string }[] | null)?.[0];
      const fresh = latest && Date.now() - new Date(latest.created_at).getTime() < 30 * 60 * 1000;
      if (latest && latest.status === "fitting" && fresh) {
        runIdRef.current = latest.id;
        animatePull(1);
        setPhase("animating");
        startPoll();
      } else {
        stopPoll();
        runIdRef.current = null;
        setPhase("dormant");
        animatePull(0);
        setFault("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  /* ---- spring/latch the handle to a target pull ------------------------- */
  const animatePull = useCallback((target: number, then?: () => void) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = () => {
      setPull((p) => {
        const next = p + (target - p) * 0.22;
        if (Math.abs(target - next) < 0.004) {
          rafRef.current = null;
          then?.();
          return target;
        }
        rafRef.current = requestAnimationFrame(step);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  /* ---- polling the run row ---------------------------------------------- */
  const stopPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  const startPoll = () => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      const id = runIdRef.current;
      if (!id) return;
      const { data } = await supabase
        .from("disposition_runs")
        .select("status,error")
        .eq("id", id)
        .single();
      const row = data as { status: string; error: string | null } | null;
      if (!row) return;
      if (row.status === "done") {
        stopPoll();
        setPhase("alive");
        setTimeout(() => {
          animatePull(0, () => setPhase("dormant"));
        }, 3600);
      } else if (row.status === "error") {
        stopPoll();
        setFault(row.error || "The engine faulted during the fit.");
        setPhase("fault");
        animatePull(0);
      }
    }, 2500);
  };

  /* ---- throwing the switch --------------------------------------------- */
  const engage = useCallback(async () => {
    setPhase("animating");
    animatePull(1);
    try {
      const res = await fetch("/api/dispositions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.runId) {
        setFault(body?.error || "The engine would not start.");
        setPhase("fault");
        animatePull(0);
        return;
      }
      runIdRef.current = body.runId;
      startPoll();
    } catch {
      setFault("Could not reach the engine. Check your connection and try again.");
      setPhase("fault");
      animatePull(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const canThrow = phase === "dormant" || phase === "fault";

  const onDown = (e: React.PointerEvent) => {
    if (!canThrow || !campaignId) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragStartY.current = e.clientY;
    setFault("");
    setPhase("arming");
  };
  const onMove = (e: React.PointerEvent) => {
    if (phase !== "arming" || dragStartY.current === null) return;
    const frac = Math.max(0, Math.min(1, (e.clientY - dragStartY.current) / PULL_PX));
    setPull(frac);
  };
  const onUp = () => {
    if (phase !== "arming") return;
    dragStartY.current = null;
    setPull((p) => {
      if (p >= COMMIT) {
        engage();
        return 1;
      }
      animatePull(0);
      setPhase("dormant");
      return p;
    });
  };

  // Keyboard / reduced-motion fallback: a plain throw.
  const throwIt = () => {
    if (!canThrow || !campaignId) return;
    setFault("");
    engage();
  };

  /* ---- derived geometry ------------------------------------------------- */
  const angle = OPEN_DEG * (1 - pull);          // 0 = seated (down)
  const seated = pull > 0.96;
  const live = phase === "animating" || phase === "alive";

  const plate = {
    dormant: { big: "Dormant", sub: "Pull the switch to animate the engine." },
    arming: { big: "…", sub: "Throw it all the way down." },
    animating: { big: "Animating", sub: "The engine is fitting. Hold tight." },
    alive: { big: "It's alive!", sub: "Dispositions updated." },
    fault: { big: "Fault", sub: fault },
  }[phase];

  const campaignName = campaigns.find((c) => c.id === campaignId)?.name || "";

  return (
    <div style={S.room}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>The Power Room</div>
          <h1 style={S.title}>Animate the engine</h1>
        </div>
        <label style={S.pick}>
          <span style={S.pickLabel}>Campaign</span>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            style={S.select}
            disabled={live}
          >
            {campaigns.length === 0 && <option value="">No campaigns</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </header>

      <div style={S.stage}>
        <svg viewBox="0 0 400 520" style={S.svg} role="img"
             aria-label="Knife switch that starts a disposition fit">
          <defs>
            <radialGradient id="halo" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor={live ? "#3a2d12" : "#1f1730"} />
              <stop offset="100%" stopColor="#100b18" />
            </radialGradient>
            <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E4C56B" />
              <stop offset="100%" stopColor={C.brassDim} />
            </linearGradient>
            <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9974F" />
              <stop offset="100%" stopColor="#8A5526" />
            </linearGradient>
          </defs>

          {/* room halo */}
          <rect x="0" y="0" width="400" height="520" fill="url(#halo)" />

          {/* flanking coils */}
          {[78, 322].map((cx, i) => (
            <g key={i} className={live ? "coil coil-on" : "coil"}>
              <rect x={cx - 18} y="120" width="36" height="250" rx="8" fill={C.stone2} stroke={C.line} />
              {[150, 190, 230, 270, 310].map((cy) => (
                <ellipse key={cy} cx={cx} cy={cy} rx="22" ry="7" fill="none"
                         stroke={live ? C.copper : "#5a4a2c"} strokeWidth="3" />
              ))}
              <circle cx={cx} cy="118" r="12" fill={live ? C.spark : "#2d2140"}
                      className={live ? "orb" : ""} />
            </g>
          ))}

          {/* Jacob's ladder between the coils (only while live) */}
          {live && (
            <g className="ladder" stroke={C.spark} strokeWidth="2" fill="none" opacity="0.9">
              <path className="arc a1" d="M90 150 L160 142 L120 162 L200 150 L150 168 L240 158 L310 150" />
              <path className="arc a2" d="M90 150 L150 158 L130 140 L210 156 L160 142 L250 154 L310 150" />
            </g>
          )}

          {/* slate base board */}
          <rect x="120" y="92" width="160" height="356" rx="14" fill={C.stone} stroke={C.line} strokeWidth="2" />
          <rect x="120" y="92" width="160" height="356" rx="14" fill="none" stroke="#0c0814" strokeWidth="1" opacity="0.6" />

          {/* terminal bolts */}
          {[120, 280].map((x) => [120, 420].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#0c0814" />
          )))}

          {/* lower jaws (the contacts the blade seats into) */}
          <g>
            <rect x="178" y="404" width="14" height="34" rx="3" fill="url(#copper)" />
            <rect x="208" y="404" width="14" height="34" rx="3" fill="url(#copper)" />
            {seated && (
              <g className="seatArc" stroke={C.spark} strokeWidth="2" fill="none">
                <path d="M186 410 L200 402 L196 414 L214 406" />
              </g>
            )}
          </g>

          {/* pivot hinge */}
          <circle cx="200" cy="150" r="12" fill="url(#brass)" stroke="#0c0814" />
          <circle cx="200" cy="150" r="4" fill="#0c0814" />

          {/* the blade + handle, rotating about the pivot */}
          <g transform={`rotate(${angle} 200 150)`} style={{ cursor: canThrow ? "grab" : "default" }}>
            {/* double-pole copper blades */}
            <rect x="184" y="150" width="9" height="268" rx="4" fill="url(#copper)" stroke="#5a3717" />
            <rect x="207" y="150" width="9" height="268" rx="4" fill="url(#copper)" stroke="#5a3717" />
            {/* tie bar */}
            <rect x="184" y="300" width="32" height="10" rx="3" fill="url(#brass)" />
            {/* insulated handle shaft + ball */}
            <rect x="195" y="404" width="10" height="46" rx="4" fill="#2a1d10" />
            <circle cx="200" cy="462" r="22" fill="#1c130a" stroke={C.brass} strokeWidth="3" />
            <circle cx="193" cy="455" r="6" fill="#3a2a16" />
            {/* drag target (bigger than the ball, for easy grabbing) */}
            <circle cx="200" cy="462" r="40" fill="transparent"
                    onPointerDown={onDown} onPointerMove={onMove}
                    onPointerUp={onUp} onPointerCancel={onUp}
                    style={{ cursor: canThrow ? "grab" : "default", touchAction: "none" }} />
          </g>

          {/* throw-progress hint while arming */}
          {phase === "arming" && (
            <g>
              <rect x="300" y="150" width="10" height="268" rx="5" fill="#0c0814" />
              <rect x="300" y={150 + 268 * (1 - pull)} width="10" height={268 * pull} rx="5"
                    fill={pull >= COMMIT ? C.good : C.sun} />
            </g>
          )}
        </svg>

        {/* status plate */}
        <div style={{ ...S.plate, borderColor: phase === "fault" ? C.warn : C.line }}>
          <div style={{
            ...S.plateBig,
            color: phase === "alive" ? C.sun : phase === "fault" ? C.warn : C.text,
          }} className={phase === "alive" ? "alivePulse" : undefined}>
            {plate.big}
          </div>
          <div style={S.plateSub}>{plate.sub}</div>
          {campaignName && phase !== "fault" && (
            <div style={S.plateMeta}>{campaignName}</div>
          )}
        </div>

        {/* accessible / keyboard throw */}
        <button onClick={throwIt} disabled={!canThrow || !campaignId} style={{
          ...S.throwBtn,
          opacity: canThrow && campaignId ? 1 : 0.5,
          cursor: canThrow && campaignId ? "pointer" : "default",
        }}>
          {phase === "animating" ? "Animating…" : "Throw the switch"}
        </button>

        {phase === "alive" && (
          <a href="/gm/dispositions" style={S.link}>View dispositions →</a>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
const S: Record<string, React.CSSProperties> = {
  room: {
    minHeight: "100dvh", background: `radial-gradient(circle at 50% 30%, ${C.room}, ${C.bg})`,
    color: C.text, padding: "28px 20px 60px",
    fontFamily: "'Iowan Old Style', Georgia, serif",
  },
  header: {
    maxWidth: 760, margin: "0 auto 8px", display: "flex",
    alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
  },
  eyebrow: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: C.brass,
  },
  title: { margin: "4px 0 0", fontSize: 30, fontWeight: 600, letterSpacing: 0.2 },
  pick: { display: "flex", flexDirection: "column", gap: 4 },
  pickLabel: {
    fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: 2,
    textTransform: "uppercase", color: C.muted,
  },
  select: {
    background: C.stone, color: C.text, border: `1px solid ${C.line}`,
    borderRadius: 8, padding: "8px 12px", fontSize: 14, minWidth: 220,
    fontFamily: "'Iowan Old Style', Georgia, serif",
  },
  stage: { maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" },
  svg: { width: "100%", maxWidth: 400, display: "block", userSelect: "none" },
  plate: {
    marginTop: 6, width: "100%", maxWidth: 380, textAlign: "center",
    background: C.stone, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px",
  },
  plateBig: { fontSize: 26, fontWeight: 700, letterSpacing: 0.3 },
  plateSub: { marginTop: 6, fontSize: 14, color: C.muted, minHeight: 20 },
  plateMeta: {
    marginTop: 8, fontFamily: "ui-monospace, monospace", fontSize: 11,
    letterSpacing: 1.5, textTransform: "uppercase", color: C.brass,
  },
  throwBtn: {
    marginTop: 18, background: "transparent", color: C.brass,
    border: `1px solid ${C.brass}`, borderRadius: 999, padding: "10px 22px",
    fontFamily: "ui-monospace, monospace", fontSize: 12, letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  link: { marginTop: 14, color: C.plum, fontSize: 14, textDecoration: "none", borderBottom: `1px solid ${C.plum}` },
};

const CSS = `
  @media (prefers-reduced-motion: no-preference) {
    .arc { stroke-dasharray: 4 6; animation: flick 0.18s steps(2) infinite; }
    .a2 { animation-delay: 0.09s; }
    .seatArc { animation: flick 0.12s steps(2) infinite; }
    .orb { animation: orb 1.1s ease-in-out infinite; }
    .coil-on ellipse { animation: warm 1.6s ease-in-out infinite; }
    .alivePulse { animation: alive 0.5s ease-out 3; }
  }
  @keyframes flick { 0%{opacity:.35} 50%{opacity:1} 100%{opacity:.5} }
  @keyframes orb { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes warm { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes alive { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
  select:focus, button:focus, a:focus { outline: 2px solid ${C.brass}; outline-offset: 2px; }
`;
