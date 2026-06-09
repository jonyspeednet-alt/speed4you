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
    <div style={{ width: s, height: s, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", overflow: "hidden", padding: 3, flexShrink: 0 }}>
      {!e && src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain" }} loading="lazy" onError={() => setE(true)} /> : <span style={{ color: "#08111d", fontWeight: 900, fontSize: s * 0.3 }}>{ini}</span>}
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

  useEffect(() => {
    let ok = false;
    setErr("");
    tvService.getChannels().then((r) => {
      if (!ok) {
        setChs(r.channels || []);
        setCats(r.categories || []);
        setSid(r.defaultStreamId || r.channels?.[0]?.streamId || "");
      }
    }).catch((e) => {
      if (!ok) setErr(e?.message || "Failed to load TV channels");
    }).finally(() => { if (!ok) setLoad(false); });
    return () => { ok = true; };
  }, []);

  const list = useMemo(() => cat === "All" ? chs : chs.filter((c) => c.category === cat || c.categories?.includes(cat)), [chs, cat]);
  const cur = useMemo(() => chs.find((c) => c.streamId === sid) || list[0] || null, [chs, list, sid]);
  useEffect(() => { setPLoad(true); }, [sid]);

  const url = cur ? `${API}/api/tv/player/${cur.streamId}?${new URLSearchParams({ name: cur.name || "", category: cur.category || "" })}` : "";
  const cc = catColor(cur?.category);

  return (
    <div style={{ minHeight: "100vh", padding: isMobile ? "56px 6px 12px" : "72px 12px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* PLAYER */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: isMobile ? 10 : 14, background: "#000", overflow: "hidden", marginBottom: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
          {load ? (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#4facfe", animation: "sp .8s linear infinite" }} />
            </div>
          ) : url ? (
            <>
              {pLoad && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)", zIndex: 2 }}><div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#4facfe", animation: "sp .8s linear infinite" }} /></div>}
              <iframe key={cur?.streamId} src={url} title={cur?.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" allowFullScreen onLoad={() => setPLoad(false)} />
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.3)", fontSize: ".85rem" }}>Select a channel</div>
          )}
        </div>

        {/* NOW PLAYING */}
        {cur && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${cc}20`, marginBottom: 8, fontSize: ".8rem" }}>
            <Logo src={api(cur.logoPath)} name={cur.name} s={26} />
            <span style={{ flex: 1, color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur.name}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#ffd8bd", fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff624d", boxShadow: "0 0 0 3px rgba(255,98,77,0.15)", animation: "pulse 1.8s ease-in-out infinite" }} />Live
            </span>
          </div>
        )}

        {/* CATEGORIES */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {["All", ...cats].map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} style={{ padding: "4px 10px", borderRadius: 999, fontSize: ".65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: cat === c ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: cat === c ? "var(--text-primary)" : "var(--text-muted)", border: cat === c ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.05)" }}>{c}</button>
          ))}
        </div>

        {/* GRID */}
        {load ? <div style={{ color: "var(--text-muted)", padding: 12, fontSize: ".8rem" }}>Loading...</div> : err ? <div style={{ color: "#ff6b6b", padding: 12, fontSize: ".8rem", textAlign: "center" }}>{err}</div> : (
          <div style={{ display: "grid", gap: 4, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(170px,1fr))" }}>
            {list.map((ch) => {
              const a = ch.streamId === sid;
              const c = catColor(ch.category);
              return (
                <button key={ch.id} type="button" onClick={() => setSid(ch.streamId)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "6px 8px" : "8px 10px", borderRadius: 8, textAlign: "left", cursor: "pointer", background: a ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", border: a ? `1px solid ${c}33` : "1px solid rgba(255,255,255,0.04)" }}>
                  <Logo src={api(ch.logoPath)} name={ch.name} s={isMobile ? 26 : 30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--text-primary)", fontSize: isMobile ? ".68rem" : ".74rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</div>
                    <div style={{ color: c, fontSize: ".55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{ch.category}</div>
                  </div>
                  {a && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff624d", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(255,98,77,.15)}50%{transform:scale(1.15);box-shadow:0 0 0 5px rgba(255,98,77,.22)}}`}</style>
    </div>
  );
}
