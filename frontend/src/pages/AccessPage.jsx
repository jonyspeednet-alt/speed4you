import { useState, useEffect } from "react";
import { accessService } from "../services";
import { useNavigate } from "react-router-dom";
import { useBreakpoint, useTVMode } from "../hooks";

function AccessPage() {
  const [status, setStatus] = useState("checking");
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const isTVMode = useTVMode();

  async function checkAccess() {
    setStatus("checking");
    try {
      const result = await accessService.checkAccess();
      if (result.allowed) {
        navigate("/");
      } else {
        setStatus("restricted");
      }
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    checkAccess();
  }, [navigate]);

  if (status === "checking") {
    return (
      <div style={styles.page}>
        <div
          style={{
            ...styles.content,
            ...(isTVMode ? styles.contentTV : {}),
            ...(isMobile ? styles.contentMobile : {}),
          }}
        >
          <div style={styles.icon}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ animation: "spin 2s linear infinite" }}
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            </svg>
          </div>
          <p style={styles.text}>Checking network access...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div
        style={{
          ...styles.content,
          ...(isTVMode ? styles.contentTV : {}),
          ...(isMobile ? styles.contentMobile : {}),
        }}
      >
        <div style={styles.icon}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>

        <h1 style={styles.title}>{status === "error" ? "Access Check Failed" : "Network Restricted"}</h1>
        <p style={styles.text}>
          {status === "error"
            ? "We could not verify your network connection right now."
            : "This platform is available only to ISP network users."}
        </p>
        <p style={styles.subtext}>
          {status === "error"
            ? "Try again or return to the portal home page."
            : "Please connect to our network to access this content."}
        </p>

        <div style={styles.info}>
          <h3>How to access:</h3>
          <ul style={styles.accessList}>
            <li>Connect to our WiFi network</li>
            <li>Use your home internet connection</li>
            <li>Connect via our mobile data network</li>
          </ul>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.retryBtn} onClick={checkAccess}>
            Try again
          </button>
          <button type="button" style={styles.homeBtn} onClick={() => navigate("/")}>
            Return home
          </button>
        </div>

        <div style={styles.help}>
          <p>Need help? Contact our support team.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--spacing-xl)",
  },
  content: {
    maxWidth: "500px",
    textAlign: "center",
  },
  contentTV: {
    maxWidth: "760px",
    fontSize: "1.25rem",
  },
  contentMobile: {
    maxWidth: "100%",
  },
  icon: {
    color: "var(--accent-red)",
    marginBottom: "var(--spacing-xl)",
  },
  title: {
    fontSize: "clamp(2rem, 4vw, 4rem)",
    marginBottom: "var(--spacing-md)",
    color: "var(--text-primary)",
  },
  text: {
    fontSize: "clamp(1.1rem, 1.4vw, 1.45rem)",
    color: "var(--text-secondary)",
    marginBottom: "var(--spacing-sm)",
  },
  subtext: {
    fontSize: "1rem",
    color: "var(--text-muted)",
    marginBottom: "var(--spacing-xl)",
  },
  info: {
    textAlign: "left",
    background: "var(--bg-secondary)",
    padding: "var(--spacing-lg)",
    borderRadius: "var(--radius-lg)",
    marginBottom: "var(--spacing-xl)",
  },
  accessList: {
    listStyle: "disc",
    paddingLeft: "20px",
    marginTop: "12px",
    display: "grid",
    gap: "8px",
    color: "var(--text-secondary)",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "var(--spacing-lg)",
  },
  retryBtn: {
    padding: "11px 18px",
    border: "1px solid var(--accent-secondary)",
    borderRadius: "999px",
    background: "rgba(82, 216, 232, 0.12)",
    color: "var(--accent-secondary)",
    fontWeight: "700",
    cursor: "pointer",
  },
  homeBtn: {
    padding: "11px 18px",
    border: "1px solid var(--border-color)",
    borderRadius: "999px",
    background: "var(--bg-secondary)",
    color: "var(--text-secondary)",
    fontWeight: "700",
    cursor: "pointer",
  },
  help: {
    color: "var(--text-muted)",
    fontSize: "0.9rem",
  },
};

export default AccessPage;
