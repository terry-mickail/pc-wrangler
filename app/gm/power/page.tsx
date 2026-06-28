"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WranglerNav from "@/components/wrangler-nav";

/* Wrangler — the Power Room.
   The DM throws a wall-mounted breaker to bring the disposition engine to life.
   The switch is a flipbook of pre-rendered frames: the lever travels from OPEN
   (top) to CLOSE (bottom) as you drag down or hit the button, then two alive
   frames alternate to crackle while the cloud fit runs. The state machine stays
   honest: it only latches while a fit is genuinely running, flashes alive when
   the run row says done, and snaps back open on error. */

const C = {
  bg: "#0D0916", room: "#1B1426", stone: "#241A33", line: "#3D2F52",
  text: "#F4EEFA", muted: "#A597BD", brass: "#C8A24B", plum: "#9B7BD4",
  warn: "#E07A5F", good: "#5DBE9A", sun: "#F4C430", ember: "#E8923A",
};

type Phase = "dormant" | "arming" | "animating" | "alive" | "fault";
type Campaign = { id: string; name: string };

const PULL_PX = 200;   // drag distance for a full throw
const COMMIT = 0.8;    // fraction past which the switch latches

// lever flipbook, OPEN (top) to CLOSE (bottom)
const FRAMES = [
  "/breaker-open.png",
  "/breaker-1.png",
  "/breaker-2.png",
  "/breaker-3.png",
  "/breaker-closed.png",
];
const ALIVE = ["/breaker-alive-1.png", "/breaker-alive-2.png"];

export default function PowerRoomPage() {
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("dormant");
  const [pull, setPull] = useState(0);          // 0 = open (top), 1 = closed (seated)
  const [fault, setFault] = useState<string>("");

  const runIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartY = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  /* preload every frame so the flipbook never flickers mid-drag */
  useEffect(() => {
    [...FRAMES, ...ALIVE].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

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
        setPull(1);
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

  /* ---- spring the lever to a target, flipping frames as it travels ------- */
  const animatePull = useCallback((target: number, then?: () => void) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = () => {
      setPull((p) => {
        const next = p + (target - p) * 0.18;
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
        setTimeout(() => animatePull(0, () => setPhase("dormant")), 3600);
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
    animatePull(1);                  // lever travels the rest of the way to CLOSE
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

  // Button / keyboard fallback: auto-throw and fire.
  const throwIt = () => {
    if (!canThrow || !campaignId) return;
    setFault("");
    engage();
  };

  /* ---- which frame to show --------------------------------------------- */
  const seated = pull > 0.985;
  const live = phase === "animating" || phase === "alive";
  const showAlive = live && seated;
  const frameIdx = Math.round(pull * (FRAMES.length - 1));

  const plate = {
    dormant: { big: "Dormant", sub: "Pull the lever down, or hit the switch." },
    arming: { big: "…", sub: "Drag it all the way to CLOSE." },
    animating: { big: "Animating", sub: "The engine is fitting. Hold tight." },
    alive: { big: "It's alive!", sub: "Dispositions updated." },
    fault: { big: "Fault", sub: fault },
  }[phase];

  const campaignName = campaigns.find((c) => c.id === campaignId)?.name || "";

  return (
    <div style={S.room}>
      <style>{CSS}</style>

      <div style={S.shell}>
        <WranglerNav />

        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>The Power Room</div>
            <h1 style={S.title}>Animate the engine</h1>
          </div>
          <label style={S.pick}>
            <span style={S.pickLabel}>Campaign</span>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={S.select} disabled={live}>
              {campaigns.length === 0 && <option value="">No campaigns</option>}
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </header>

        <div style={S.stage}>
          {/* breaker on the wall, with a glow that swells when live */}
          <div style={S.breakerStage}>
            <div style={{ ...S.glow, opacity: showAlive ? 1 : live ? 0.7 : 0.28 }} />
            <div
              style={{ ...S.breakerWrap, cursor: canThrow ? "grab" : "default" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              role="img"
              aria-label={`Breaker switch, ${seated ? "closed" : "open"}`}
            >
              {showAlive ? (
                <>
                  <img src={ALIVE[0]} alt="" draggable={false} className="alive-a" style={S.layerImg} />
                  <img src={ALIVE[1]} alt="" draggable={false} className="alive-b" style={S.layerImg} />
                </>
              ) : (
                <img src={FRAMES[frameIdx]} alt="" draggable={false} style={S.layerImg} />
              )}
            </div>
          </div>

          {/* status plate */}
          <div style={{ ...S.plate, borderColor: phase === "fault" ? C.warn : C.line }}>
            <div
              style={{ ...S.plateBig, color: phase === "alive" ? C.sun : phase === "fault" ? C.warn : C.text }}
              className={phase === "alive" ? "alivePulse" : undefined}
            >
              {plate.big}
            </div>
            <div style={S.plateSub}>{plate.sub}</div>
            {campaignName && phase !== "fault" && <div style={S.plateMeta}>{campaignName}</div>}
          </div>

          {/* button throw */}
          <button onClick={throwIt} disabled={!canThrow || !campaignId} style={{
            ...S.throwBtn,
            opacity: canThrow && campaignId ? 1 : 0.5,
            cursor: canThrow && campaignId ? "pointer" : "default",
          }}>
            {phase === "animating" ? "Animating…" : "Throw the switch"}
          </button>

          {phase === "alive" && <a href="/gm/dispositions" style={S.link}>View dispositions →</a>}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
const WALL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")";

const S: Record<string, React.CSSProperties> = {
  room: {
    minHeight: "100dvh", color: C.text,
    fontFamily: "'Iowan Old Style', Georgia, serif",
    backgroundColor: C.bg,
    backgroundImage: [
      WALL,
      "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(74,54,98,0.40), transparent 70%)",
      "radial-gradient(ellipse 120% 70% at 50% 118%, rgba(8,5,14,0.92), transparent 60%)",
      "linear-gradient(180deg, #241B33, #120C1E 70%, #0B0714)",
    ].join(","),
    backgroundAttachment: "fixed",
  },
  shell: { maxWidth: 820, margin: "0 auto", padding: "32px 20px 64px" },
  header: {
    margin: "0 auto 6px", display: "flex",
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
  stage: { maxWidth: 460, margin: "14px auto 0", display: "flex", flexDirection: "column", alignItems: "center" },

  breakerStage: { position: "relative", width: "100%", display: "flex", justifyContent: "center", padding: "8px 0" },
  glow: {
    position: "absolute", top: "50%", left: "50%", width: "78%", height: "70%",
    transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "none",
    background: `radial-gradient(ellipse at center, ${C.ember} 0%, rgba(232,146,58,0.35) 35%, transparent 70%)`,
    filter: "blur(26px)", transition: "opacity 0.35s ease",
  },
  breakerWrap: {
    position: "relative", width: "min(340px, 84vw)", aspectRatio: "1792 / 2338",
    touchAction: "none", userSelect: "none",
  },
  layerImg: {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "contain", userSelect: "none", pointerEvents: "none",
    filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55))",
  },

  plate: {
    marginTop: 10, width: "100%", maxWidth: 380, textAlign: "center",
    background: "rgba(36,27,51,0.78)", border: `1px solid ${C.line}`, borderRadius: 12,
    padding: "16px 18px", backdropFilter: "blur(2px)",
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
    fontFamily: "ui-monospace, monospace", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase",
  },
  link: { marginTop: 14, color: C.plum, fontSize: 14, textDecoration: "none", borderBottom: `1px solid ${C.plum}` },
};

const CSS = `
  .alive-a, .alive-b { will-change: opacity; }
  @media (prefers-reduced-motion: no-preference) {
    .alive-a { animation: aflipA 0.22s steps(1, end) infinite; }
    .alive-b { animation: aflipB 0.22s steps(1, end) infinite; }
    .alivePulse { animation: alive 0.5s ease-out 3; }
  }
  @keyframes aflipA { 0%, 49.9% { opacity: 1 } 50%, 100% { opacity: 0 } }
  @keyframes aflipB { 0%, 49.9% { opacity: 0 } 50%, 100% { opacity: 1 } }
  @keyframes alive { 0% { transform: scale(1) } 40% { transform: scale(1.12) } 100% { transform: scale(1) } }
  select:focus, button:focus, a:focus { outline: 2px solid ${C.brass}; outline-offset: 2px; }
`;
