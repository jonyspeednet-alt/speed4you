import { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/videoPlayer.css';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayerModal({ src, title, onClose, onNext }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRate, setShowRate] = useState(false);
  const [error, setError] = useState('');
  const controlsTimer = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const progressRef = useRef(null);
  const [volHover, setVolHover] = useState(false);
  const prevVolumeRef = useRef(1);

  const startHideTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => { setShowControls(false); setShowRate(false); }, 3000);
  }, []);

  useEffect(() => { startHideTimer(); return () => clearTimeout(controlsTimer.current); }, [startHideTimer]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!showRate && !volHover) return;
    const handler = (e) => {
      if (showRate && !e.target.closest('.player-speed-btn') && !e.target.closest('.player-speed-popup') && !e.target.closest('.player-speed-opt')) {
        setShowRate(false);
      }
      if (volHover && !e.target.closest('.player-volume-wrap')) {
        setVolHover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showRate, volHover]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    v.paused ? v.play().then(() => setPlaying(true)).catch(() => {}) : (v.pause(), setPlaying(false));
    startHideTimer();
  }, [startHideTimer]);

  const seek = useCallback((dir) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir * 10));
  }, []);

  const toggleFS = useCallback(async () => {
    const el = document.querySelector('.modal-player-wrap');
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current; if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  }, []);

  const changeRate = useCallback((r) => {
    if (videoRef.current) videoRef.current.playbackRate = r;
    setRate(r); setShowRate(false); startHideTimer();
  }, [startHideTimer]);

  const changeVolume = useCallback((v) => {
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
    setVolume(v); setMuted(v === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.muted || volume === 0) {
      const restore = prevVolumeRef.current || 0.75;
      v.muted = false; v.volume = restore;
      setMuted(false); setVolume(restore);
    } else {
      prevVolumeRef.current = volume;
      v.muted = true; setMuted(true);
    }
    startHideTimer();
  }, [volume, startHideTimer]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFS(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'ArrowLeft': e.preventDefault(); seek(-1); break;
        case 'ArrowRight': e.preventDefault(); seek(1); break;
        case 'Escape': e.preventDefault(); onClose?.(); break;
        case 'p': e.preventDefault(); togglePiP(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, toggleFS, toggleMute, togglePiP, seek, onClose]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const update = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    v.addEventListener('timeupdate', update);
    v.addEventListener('loadedmetadata', update);
    return () => { v.removeEventListener('timeupdate', update); v.removeEventListener('loadedmetadata', update); };
  }, []);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  const handleProgressClick = useCallback((e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = v.duration * pct;
  }, []);

  const handleProgressHover = useCallback((e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(v.duration * pct);
    setHoverX(e.clientX - rect.left);
  }, []);

  const handleProgressLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-wrap modal-player-wrap" style={{ cursor: showControls ? 'default' : 'none' }}>
      <div className={`player-top-bar ${showControls ? 'visible' : 'hidden'}`}>
        <button className="player-back-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <span className="player-title">{title}</span>
        <div className="player-spacer" />
        <button className="player-ctrl-btn" onClick={onClose} title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="player-video-area" onMouseMove={startHideTimer} onClick={togglePlay}>
        {error ? (
          <div className="player-error" style={{ minHeight: 'auto', padding: 40 }}>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={src}
              autoPlay playsInline
              className="player-video"
              onClick={e => e.stopPropagation()}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onError={() => setError('Failed to play')}
              onEnded={() => { if (onNext) setTimeout(onNext, 1500); }}
            />
          </>
        )}
      </div>

      <div className={`player-bottom-controls ${showControls ? 'visible' : 'hidden'}`}>
        {!error && (
          <>
            <div className="player-progress-wrap" ref={progressRef}
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              <div className="player-progress-track">
                <div className="player-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              {hoverTime !== null && (
                <div className="player-progress-hover" style={{ left: `${hoverX}px` }}>
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            <div className="player-controls-row">
              <button className="player-ctrl-btn" onClick={e => { e.stopPropagation(); togglePlay(); }} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  {playing ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                    : <polygon points="8,5 19,12 8,19"/>}
                </svg>
              </button>

              <button className="player-seek-btn" onClick={e => { e.stopPropagation(); seek(-1); }} title="Rewind 10s">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
                <span>10</span>
              </button>

              <button className="player-seek-btn" onClick={e => { e.stopPropagation(); seek(1); }} title="Forward 10s">
                <span>10</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>

              <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>

              <div className="player-volume-wrap"
                onMouseEnter={() => setVolHover(true)}
                onMouseLeave={() => setVolHover(false)}
                onTouchStart={() => setVolHover(true)}
              >
                <button className="player-ctrl-btn" onClick={e => { e.stopPropagation(); toggleMute(); }} title="Mute (M)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    {muted || volume === 0
                      ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/></>
                      : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                    }
                  </svg>
                </button>
                <div className={`player-volume-slider ${volHover ? 'open' : ''}`}>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={e => { const val = parseFloat(e.target.value); changeVolume(val); }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="player-spacer" />

              <div style={{ position: 'relative' }}>
                <button className="player-speed-btn" onClick={e => { e.stopPropagation(); setShowRate(v => !v); }}>
                  {rate}x
                </button>
                {showRate && (
                  <div className="player-speed-popup">
                    {RATES.map(r => (
                      <button key={r} className={`player-speed-opt ${rate === r ? 'active' : ''}`}
                        onClick={() => changeRate(r)}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="player-ctrl-btn" onClick={e => { e.stopPropagation(); togglePiP(); }} title="Picture in Picture (P)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="18" rx="2"/><rect x="11" y="9" width="11" height="8" rx="1"/>
                </svg>
              </button>

              <button className="player-ctrl-btn" onClick={e => { e.stopPropagation(); toggleFS(); }} title="Fullscreen (F)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>

            {onNext && (
              <div className="player-next-hint">
                Next: auto-plays when current ends
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
