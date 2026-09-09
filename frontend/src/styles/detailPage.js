const posterFallback = `${import.meta.env.BASE_URL}assets/poster-placeholder.svg`;

export const posterFallbackUrl = posterFallback;

/**
 * Phase 3: responsive backdrop srcSet. Phones fetch w780 (~1/3 bytes),
 * desktops/4K fetch w1280. Non-TMDB URLs pass through untouched.
 */
export function getBackdropSrcSet(url) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return undefined;
  const parts = url.match(/^(.*\/t\/p\/)[^/]+(\/.*)$/);
  if (!parts) return undefined;
  return `${parts[1]}w780${parts[2]} 800w, ${parts[1]}w1280${parts[2]} 1280w`;
}

export const DETAIL_SKELETON = {
  page: {
    minHeight: "100vh",
    paddingTop: "calc(var(--nav-occupied-desktop) + 8px)",
    position: "relative",
    overflow: "hidden",
    background: "#11151b",
  },
  hero: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    padding: "24px",
  },
  skeletonBlock: { background: "rgba(255,255,255,0.08)", borderRadius: "6px" },
  skeletonLine: { background: "rgba(255,255,255,0.08)", borderRadius: "999px" },
  heroGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, #050c16 0%, transparent 40%)",
  },
  heroInner: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1192px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "200px minmax(0, 1fr)",
    gap: "28px",
    alignItems: "center",
  },
  heroInnerTablet: { gridTemplateColumns: "1fr", gap: "32px" },
  heroInnerMobile: {
    width: "100%",
    gridTemplateColumns: "1fr",
    gap: "24px",
    padding: 0,
    alignItems: "start",
  },
  posterWrap: {
    position: "relative",
    borderRadius: "6px",
    overflow: "hidden",
    boxShadow: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    height: "300px",
    minWidth: 0,
  },
  posterWrapMobile: {
    width: "100%",
    maxWidth: "180px",
    margin: "0 auto",
    height: "300px",
  },
  posterGlow: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.1), transparent 40%)",
    pointerEvents: "none",
  },
  poster: { width: "100%", height: "100%", objectFit: "cover" },
  infoPanel: { display: "flex", flexDirection: "column", gap: "20px" },
  infoPanelMobile: { gap: "16px" },
  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "var(--accent-primary)",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: "0.75rem",
    fontWeight: "900",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
  },
  genreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
  },
  infoPanelBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
};

export const DETAIL_STYLES = {
  page: {
    minHeight: "100vh",
    paddingTop: "calc(var(--nav-occupied-desktop) + 8px)",
    position: "relative",
    overflow: "hidden",
    background: "#08080a",
  },

  auroraOrb: {
    position: "absolute",
    width: "60vw",
    height: "60vw",
    borderRadius: "50%",
    filter: "blur(120px)",
    opacity: 0.12,
    zIndex: 0,
    pointerEvents: "none",
  },

  hero: {
    position: "relative",
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    padding: "24px",
  },
  backdropWrap: { position: "absolute", inset: 0, zIndex: 0 },
  backdropImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 10%",
  },
  backdropOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(105deg, rgba(8,8,10,0.96) 12%, rgba(8,8,10,0.5) 45%, rgba(8,8,10,0.25) 60%, rgba(8,8,10,0.92) 100%)",
  },
  heroGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, #08080a 0%, transparent 40%)",
  },

  heroInner: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1192px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "200px minmax(0, 1fr)",
    gap: "28px",
    alignItems: "center",
  },
  heroInnerTablet: { gridTemplateColumns: "1fr", gap: "32px" },
  heroInnerMobile: {
    width: "100%",
    gridTemplateColumns: "1fr",
    gap: "24px",
    padding: 0,
    alignItems: "start",
  },

  posterWrap: {
    position: "relative",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 16px 36px rgba(0,0,0,0.85), 0 0 20px rgba(255,102,0,0.25)",
    border: "1px solid rgba(255,102,0,0.3)",
    height: "300px",
    minWidth: 0,
  },
  posterGlow: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(255,150,50,0.15), transparent 40%)",
    pointerEvents: "none",
  },
  poster: { width: "100%", height: "100%", objectFit: "cover" },
  posterWrapMobile: {
    width: "100%",
    maxWidth: "180px",
    margin: "0 auto",
    height: "300px",
  },

  originalTitle: {
    margin: 0,
    color: "rgba(255,255,255,0.65)",
    fontSize: "0.98rem",
    lineHeight: 1.6,
  },

  infoPanel: { display: "flex", flexDirection: "column", gap: "20px" },
  infoPanelMobile: { gap: "16px" },
  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#ff7700",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: "0.75rem",
    fontWeight: "900",
  },

  title: {
    fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: "1.05",
    letterSpacing: "-0.03em",
    textShadow: "0 4px 20px rgba(0,0,0,0.6)",
  },
  titleMobile: { fontSize: "clamp(2rem, 8vw, 3rem)" },

  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
  },
  ratingBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255, 102, 0, 0.12)",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 102, 0, 0.35)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },
  ratingVal: {
    color: "#ffa31a",
    fontWeight: "900",
    fontSize: "1rem",
  },
  metaChip: {
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "700",
    fontSize: "0.9rem",
    letterSpacing: "0.04em",
  },

  genreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
  },
  genreTag: {
    padding: "8px 16px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    fontSize: "0.8rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },

  btnFull: { width: "100%" },

  descWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "720px",
  },
  description: {
    margin: 0,
    color: "rgba(255,255,255,0.85)",
    fontSize: "1rem",
    lineHeight: 1.76,
  },
  descClamped: {
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  readMore: {
    appearance: "none",
    border: "none",
    background: "none",
    color: "var(--accent-primary)",
    cursor: "pointer",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: 0,
  },

  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    flexWrap: "wrap",
  },
  actionsMobile: { flexDirection: "column", alignItems: "stretch" },
  playBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px 36px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #ff7700 0%, #ff4500 100%)",
    color: "#ffffff",
    fontWeight: "900",
    fontSize: "1.05rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    boxShadow: "0 8px 24px rgba(255, 102, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
    border: "1px solid rgba(255, 136, 0, 0.6)",
    textDecoration: "none",
  },

  body: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    padding: "16px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.2fr)",
    gap: "24px",
  },
  detailGridMobile: { gridTemplateColumns: "1fr" },

  card: {
    padding: "clamp(18px, 3vw, 32px)",
    borderRadius: "12px",
    background: "linear-gradient(165deg, rgba(22, 22, 28, 0.7) 0%, rgba(12, 12, 16, 0.85) 100%)",
    border: "1px solid rgba(255, 102, 0, 0.15)",
    boxShadow: "0 14px 30px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(16px)",
  },
  cardTitle: {
    margin: "0 0 18px 0",
    color: "#ffffff",
    fontSize: "1.15rem",
    fontWeight: "900",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },
  statGridMobile: {
    gridTemplateColumns: "1fr",
    gap: "12px",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "18px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 102, 0, 0.12)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },
  statLabel: {
    color: "var(--text-muted)",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: "700",
  },
  statValue: { fontSize: "1.05rem", fontWeight: "900", color: "#ffffff" },

  synopsisText: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.8,
    fontSize: "0.98rem",
  },

  browseMore: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  browseBtn: {
    padding: "12px 24px",
    borderRadius: "12px",
    background: "linear-gradient(165deg, rgba(28, 28, 36, 0.7) 0%, rgba(14, 14, 18, 0.85) 100%)",
    border: "1px solid rgba(255, 102, 0, 0.2)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.5)",
    color: "#ffffff",
    fontSize: "0.85rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textDecoration: "none",
  },

  errorState: {
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    color: "#ffffff",
    textAlign: "center",
    padding: "40px 16px",
  },
  backLink: {
    marginTop: "12px",
    color: "var(--accent-primary)",
    textDecoration: "none",
    fontWeight: "900",
  },

  skeletonBlock: { background: "rgba(255,255,255,0.08)", borderRadius: "6px" },
  skeletonLine: { background: "rgba(255,255,255,0.08)", borderRadius: "999px" },
};
