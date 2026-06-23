const C = {
  ink: "#15131E", panel: "#211D30", line: "#332C46", vellum: "#ECE3CF",
  muted: "#8B85A0", brass: "#C8A24B",
};

const SURFACES = [
  { href: "/play", title: "Player Disposition Inventory", blurb: "The onboarding questionnaire. Public, no login.", tag: "public" },
  { href: "/gm", title: "GM Workspace", blurb: "Create a campaign, build the roster, run coverage analysis.", tag: "gm" },
  { href: "/gm/sessions", title: "Session Log", blurb: "Run a session and log events to the spine.", tag: "gm" },
];

export default function Home() {
  return (
    <div style={{ background: C.ink, color: C.vellum, minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 22px" }}>
        <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, letterSpacing: "0.24em", color: C.brass, textTransform: "uppercase", marginBottom: 16 }}>
          Wrangler
        </div>
        <h1 style={{ fontFamily: "Iowan Old Style, Palatino, Georgia, serif", fontSize: 38, fontWeight: 600, margin: "0 0 12px" }}>
          A tool for running the table, not the world.
        </h1>
        <p style={{ color: "#D8D0C0", fontSize: 16, lineHeight: 1.6, maxWidth: 540, marginBottom: 36 }}>
          In development. The surfaces below are live as they get built.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          {SURFACES.map((s) => (
            <a key={s.href} href={s.href} style={{ textDecoration: "none" }}>
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ color: C.vellum, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: C.muted, fontSize: 13.5 }}>{s.blurb}</div>
                </div>
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, color: s.tag === "public" ? "#5E8C7E" : C.brass, border: `1px solid ${s.tag === "public" ? "#5E8C7E" : C.brass}`, borderRadius: 999, padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  {s.tag}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
