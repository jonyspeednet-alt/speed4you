import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import TopNav from "../components/navigation/TopNav";
import GlobalSearchModal from "../components/navigation/GlobalSearchModal";
import SiteFooter from "../components/ui/SiteFooter";
import { ToastProvider } from "../components/ui/Toast";
import { useTVMode } from "../hooks";


function MainSiteLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTVMode = useTVMode();
  const isPlayerRoute = location.pathname.startsWith("/play/");

  useEffect(() => {
    if (!isTVMode) return;

    const handleGlobalBack = (e) => {
      const keyCode = e.keyCode || e.which;
      const isBack = e.key === "Backspace" || e.key === "Escape" || e.key === "GoBack" ||
        e.key === "XF86Back" || e.key === "BrowserBack" || keyCode === 10009 || keyCode === 461;
      if (!isBack) return;
        const activeTag = document.activeElement?.tagName;
        if (
          activeTag === "INPUT" ||
          activeTag === "TEXTAREA" ||
          activeTag === "SELECT"
        ) {
          return;
        }

        if (location.pathname !== "/") {
          e.preventDefault();
          navigate(-1);
        }
    };

    window.addEventListener("keydown", handleGlobalBack);
    return () => window.removeEventListener("keydown", handleGlobalBack);
  }, [isTVMode, location.pathname, navigate]);

  return (
    <ToastProvider>
      <div style={styles.wrapper} className="simple-site">
        <a
          href="#main-content"
          style={styles.skipLink}
          className="skip-link"
          onFocus={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.transform = "translateY(-140%)";
          }}
        >
          Skip to content
        </a>
        {!isPlayerRoute && <TopNav />}
        <GlobalSearchModal />
        <main
          id="main-content"
          style={{
            ...styles.main,
            ...(isPlayerRoute
              ? styles.mainImmersive
              : {
                  paddingTop: 0,
                  paddingBottom: 0,
                }),
          }}
        >
          <Outlet />
        </main>
        {!isPlayerRoute && <SiteFooter />}
      </div>
    </ToastProvider>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  skipLink: {
    position: "fixed",
    top: "12px",
    left: "12px",
    zIndex: 1400,
    padding: "10px 14px",
    borderRadius: "999px",
    background: "#fff",
    color: "#07111f",
    fontWeight: "700",
    transform: "translateY(-140%)",
    transition: "transform 200ms ease",
  },
  main: {
    flex: 1,
  },
  mainImmersive: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
};

export default MainSiteLayout;
