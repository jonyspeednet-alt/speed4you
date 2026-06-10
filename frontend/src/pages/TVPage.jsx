import { useEffect, useMemo, useState } from "react";
import tvService from "../services/tvService";
import { useBreakpoint } from "../hooks";

const API = (import.meta.env.VITE_API_URL || "/portal-api").replace(/\/$/, "");
const api = (p) => (p?.startsWith("http") ? p : `${API}${p}`);

const CAT_COLORS = {
  Bangla: "#ffd166", Bengali: "#ffd166", Sports: "#75e39a",
  News: "#79e4ff", Kids: "#ff93c6", Hindi: "#ffb266",
  English: "#9ae7ff", Movies: "#ffc493", Music: "#d7a4ff",
};
const catColor = (c) => {
  if (!c) return "rgba(255,255,255,0.2)";
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (c.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "rgba(255,255,255,0.2)";
};

function Logo({ src, name, s = 32 }) {
  const [e, setE] = useState(false);
  const ini = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: s, height: s, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
      {!e && src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} loading="lazy" onError={() => setE(true)} /> : <span style={{ color: "#08111d", fontWeight: 900, fontSize: s * 0.35 }}>{ini}</span>}
    </div>
  );
}

export default function TVPage() {
  const { isMobile } = useBreakpoint();
  const [chs, setChs] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("All");
  const [sid, setSid] = useState("");
  const [load, setLoad] = useState(true);
  const [pLoad, setPLoad] = useState(true);
  const [err, setErr] = useState("");
  const [pMin, setPMin] = useState(false);

  useEffect(() => {
    let ok = false;
    setErr("");
    tvService.getChannels().then((r) => {
      if (!ok) {
        setChs(r.channels || []);
        setCats(r.categories || []);
        const defId = r.defaultStreamId || r.channels?.[0]?.streamId || "";
        setSid(defId);
        if (!defId && (!r.channels || r.channels.length === 0)) {
          setErr("No channels available");
        }
      }
    }).catch((e) => {
      if (!ok) setErr(e?.message || "TV service unavailable");
    }).finally(() => { if (!ok) setLoad(false); });
    return () => { ok = true; };
  }, []);

  const list = useMemo(() => {
    if (!chs.length) return [];
    return cat === "All" ? chs : chs.filter((c) => c.category === cat || c.categories?.includes(cat));
  }, [chs, cat]);
  const cur = useMemo(() => chs.find((c) => c.streamId === sid) || list[0] || null, [chs, list, sid]);
  useEffect(() => { setPLoad(true); }, [sid]);

  const url = cur && !err ? `${API}/api/tv/player/${cur.streamId}?${new URLSearchParams({ name: cur.name || "", category: cur.category || "" })}` : "";
  const cc = catColor(cur?.category);

  const pPad = isMobile ? "56px 8px 16px" : "72px 16px 24px";
  const cardR = isMobile ? 8 : 10;

  return (
    <div style={{ minHeight: "100vh", padding: pPad }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: err && !chs.length ? 16 : 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4facfe", boxShadow: "0 0 8px rgba(79,172,254,0.6)" }} />
            <h1 style={{ margin: 0, fontSize: isMobile ? "1rem" : "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Live TV</h1>
            {!load && chs.length > 0 && <span style={{ fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 500 }}>{chs.length} channels</span>}
          </div>
          {chs.length > 0 && (
            <button type="button" onClick={() => setPMin((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: ".7rem", fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {pMin ? "Show Player" : "Hide Player"}
            </button>
          )}
        </div>

        {/* PLAYER */}
        {!pMin && !err && chs.length > 0 && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: cardR, background: "#000", overflow: "hidden", marginBottom: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
            {url ? (
              <>
                {pLoad && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.6)", zIndex: 2 }}><div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#4facfe", animation: "sp .8s linear infinite" }} /></div>}
                <iframe key={cur?.streamId} src={url} title={cur?.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" allowFullScreen onLoad={() => setPLoad(false)} />
              </>
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.25)", fontSize: ".8rem" }}>Select a channel</div>
            )}
          </div>
        )}

        {/* NOW PLAYING BAR */}
        {cur && !pMin && !err && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${cc}18`, marginBottom: 10 }}>
            <Logo src={api(cur.logoPath)} name={cur.name} s={24} />
            <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: 600, fontSize: ".75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur.name}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#ffd8bd", fontSize: ".55rem", fontWeight: 800, textTransform: "uppercase" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff624d", boxShadow: "0 0 0 3px rgba(255,98,77,0.15)", animation: "pulse 1.8s ease-in-out infinite" }} />Live
            </span>
          </div>
        )}

        {/* LOADING STATE */}
        {load && (
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(150px,1fr))" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: isMobile ? 44 : 48, borderRadius: cardR, background: "rgba(255,255,255,0.03)", animation: "shimmer 1.5s infinite" }} />
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {!load && err && !chs.length && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "40px 20px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,107,107,0.1)", display: "grid", placeItems: "center" }}>
              <span style={{ fontSize: "1.4rem", color: "#ff6b6b" }}>!</span>
            </div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: ".85rem", maxWidth: 360, lineHeight: 1.5 }}>{err}</p>
            <button type="button" onClick={() => { setLoad(true); setErr(""); tvService.getChannels().then((r) => { setChs(r.channels || []); setCats(r.categories || []); setSid(r.defaultStreamId || r.channels?.[0]?.streamId || ""); }).catch((e) => { setErr(e?.message || "TV service unavailable"); }).finally(() => setLoad(false)); }} style={{ padding: "8px 18px", borderRadius: 8, fontSize: ".75rem", fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.1)" }}>Retry</button>
          </div>
        )}

        {/* CATEGORIES */}
        {!load && chs.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {["All", ...cats].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} style={{ padding: "3px 9px", borderRadius: 999, fontSize: ".6rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: cat === c ? "rgba(255,255,255,0.1)" : "transparent", color: cat === c ? "var(--text-primary)" : "var(--text-muted)", border: cat === c ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent" }}>{c}</button>
            ))}
          </div>
        )}

        {/* CHANNEL GRID */}
        {!load && chs.length > 0 && (
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(150px,1fr))" }}>
            {list.map((ch) => {
              const a = ch.streamId === sid;
              const c = catColor(ch.category);
              return (
                <button key={ch.id} type="button" onClick={() => setSid(ch.streamId)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "5px 8px" : "7px 10px", borderRadius: cardR, textAlign: "left", cursor: "pointer", background: a ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", border: a ? `1px solid ${c}30` : "1px solid rgba(255,255,255,0.04)" }}>
                  <Logo src={api(ch.logoPath)} name={ch.name} s={isMobile ? 24 : 28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--text-primary)", fontSize: isMobile ? ".65rem" : ".72rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</div>
                    <div style={{ color: c, fontSize: ".5rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{ch.category}</div>
                  </div>
                  {a && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff624d", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* EMPTY CATEGORY */}
        {!load && chs.length > 0 && list.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: ".8rem" }}>No channels in this category</div>
        )}
      </div>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(255,98,77,.15)}50%{transform:scale(1.15);box-shadow:0 0 0 5px rgba(255,98,77,.22)}}@keyframes shimmer{0%{opacity:0.3}50%{opacity:0.08}100%{opacity:0.3}}`}</style>
    </div>
  );
}
