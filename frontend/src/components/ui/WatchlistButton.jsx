import { useEffect, useState } from "react";
import { watchlistService } from "../../services";
import { useToast } from "./useToast";

function WatchlistButton({ contentType, contentId, title, compact = false }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    let cancelled = false;
    watchlistService
      .check(contentType, contentId)
      .then((res) => {
        if (!cancelled) setSaved(Boolean(res?.inWatchlist));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [contentType, contentId]);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    if (navigator.vibrate) navigator.vibrate(10);
    try {
      if (saved) {
        await watchlistService.remove(contentId);
        setSaved(false);
        show({ message: "Removed from My List", type: "info", icon: "−" });
      } else {
        await watchlistService.add(contentType, contentId);
        setSaved(true);
        show({ message: "Added to My List", type: "success", icon: "✓" });
      }
    } catch {
      show({ message: "Could not update your list", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.compact,
          ...(saved ? styles.compactSaved : {}),
          ...(hovered && !saved ? styles.compactHover : {}),
          boxShadow: hovered && saved ? "0 0 14px var(--glow-cyan)" : "none",
        }}
        aria-label={
          saved ? `Remove ${title} from My List` : `Add ${title} to My List`
        }
        aria-pressed={saved}
        disabled={loading}
      >
        {loading ? (
          <span style={styles.spinner} aria-hidden="true" />
        ) : saved ? (
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.btn,
        ...(saved ? styles.btnSaved : {}),
        ...(hovered && !saved ? styles.btnHover : {}),
        ...(hovered && saved ? styles.btnHoverSaved : {}),
      }}
      aria-label={
        saved ? `Remove ${title} from My List` : `Add ${title} to My List`
      }
      aria-pressed={saved}
      disabled={loading}
    >
      {loading ? (
        <span style={styles.spinner} aria-hidden="true" />
      ) : saved ? (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
      <span>{saved ? "In My List" : "My List"}</span>
    </button>
  );
}

const styles = {
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 32px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "0.95rem",
    transition: "all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
    backdropFilter: "blur(16px)",
  },
  btnHover: {
    background: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.4)",
    transform: "translateY(-3px) scale(1.02)",
  },
  btnSaved: {
    background: "rgba(0,255,255,0.15)",
    borderColor: "rgba(0,255,255,0.4)",
    color: "var(--accent-cyan)",
  },
  btnHoverSaved: {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 6px 20px var(--glow-cyan)",
  },
  compact: {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    minHeight: "34px",
    padding: 0,
    borderRadius: "50%",
    background: "rgba(5, 12, 22, 0.68)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.78)",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    transition: "all 180ms ease",
    cursor: "pointer",
  },
  compactHover: {
    background: "rgba(0,255,255,0.14)",
    borderColor: "rgba(0,255,255,0.42)",
    color: "#ffffff",
    transform: "translateY(-1px) scale(1.04)",
  },
  compactSaved: {
    background: "rgba(0,255,255,0.16)",
    borderColor: "rgba(0,255,255,0.45)",
    color: "var(--accent-cyan)",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "currentColor",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },
};

export default WatchlistButton;
