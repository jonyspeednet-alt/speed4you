import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { seriesService } from '../services/seriesService';
import { progressService } from '../services/apiClient';
import { toPlayableSrc } from '../utils/mediaUrl';
import '../styles/videoPlayer.css';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayerPage() {
  const { type, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [item, setItem] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRate, setShowRate] = useState(false);
  const [error, setError] = useState('');
  const lastTapRef = useRef({ time: 0, x: 0 });
  const controlsTimer = useRef(null);
  const seasonNum = Number(sp.get('season')) || 1;
  const episodeNum = Number(sp.get('episode')) || 1;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const progressRef = useRef(null);
  const [showCenterBtns, setShowCenterBtns] = useState(false);
  const centerTimer = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volHover, setVolHover] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (type === 'movie') {
        const d = await moviesService.getById(id);
        if (d?.videoUrl) { setSrc(toPlayableSrc(d.videoUrl)); setTitle(d.title || 'Movie'); setItem(d); }
      } else if (type === 'series') {
        const d = await seriesService.getById(id);
        setItem(d);
        for (const s of d?.seasons || []) {
          if (s.number === seasonNum || Number(s.id) === seasonNum) {
            const ep = (s.episodes || []).find(e => e.number === episodeNum || Number(e.id) === episodeNum);
            if (ep?.videoUrl) { setSrc(toPlayableSrc(ep.videoUrl)); setTitle(ep.title || `Episode ${episodeNum}`); }
            break;
          }
        }
      }
    } catch { setError('Failed to load media'); }
  }, [type, id, seasonNum, episodeNum]);
  useEffect(() => { loadData(); }, [loadData]);

  const nextEp = useMemo(() => {
    if (type !== 'series' || !item?.seasons) return null;
    for (const s of item.seasons) {
      if (s.number === seasonNum || Number(s.id) === seasonNum) {
        const eps = s.episodes || [];
        const idx = eps.findIndex(e => e.number === episodeNum || Number(e.id) === episodeNum);
        if (idx >= 0 && idx < eps.length - 1) {
          return { ...eps[idx + 1], season: seasonNum, episode: eps[idx + 1].number || Number(eps[idx + 1].id) };
        }
        if (idx >= 0 && idx === eps.length - 1) {
          const nextSeasonIdx = item.seasons.indexOf(s) + 1;
          if (nextSeasonIdx < item.seasons.length) {
            const ns = item.seasons[nextSeasonIdx];
            const ne = (ns.episodes || [])[0];
            if (ne) return { ...ne, season: ns.number || Number(ns.id), episode: ne.number || Number(ne.id) };
          }
        }
      }
    }
    return null;
  }, [type, item, seasonNum, episodeNum]);

  const lastSavedRef = useRef(0);
  const saveProgress = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration || !type || !id) return;
    const position = Math.floor(v.currentTime);
    const dur = Math.floor(v.duration);
    if (position < 5) return;
    progressService.update(type, id, position, dur).catch((err) => console.error('Progress save failed:', err));
    lastSavedRef.current = position;
    if (position / dur >= 0.95) {
      progressService.markComplete(type, id).catch((err) => console.error('Progress markComplete failed:', err));
    }
  }, [type, id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
      const pos = Math.floor(v.currentTime);
      if (pos - lastSavedRef.current >= 15) saveProgress();
    };
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onPause = () => saveProgress();
    const onLoadedMeta = () => { setDuration(v.duration || 0); };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('progress', onProgress);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoadedMeta);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('progress', onProgress);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoadedMeta);
      saveProgress();
    };
  }, [src, saveProgress]);

  const startHideTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
      setShowRate(false);
    }, 3000);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; };
  }, []);

  useEffect(() => { startHideTimer(); return () => clearTimeout(controlsTimer.current); }, [startHideTimer]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
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

  const showCenterBriefly = useCallback(() => {
    clearTimeout(centerTimer.current);
    setShowCenterBtns(true);
    centerTimer.current = setTimeout(() => setShowCenterBtns(false), 1200);
  }, []);

  const handleTap = useCallback((e) => {
    const now = Date.now();
    const x = e.changedTouches?.[0]?.clientX ?? e.clientX;
    const elapsed = now - lastTapRef.current.time;
    if (elapsed < 300 && Math.abs(x - lastTapRef.current.x) < 60) {
      const isRight = x > window.innerWidth / 2;
      seek(isRight ? 1 : -1);
      showCenterBriefly();
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x };
      setShowControls(v => {
        if (!v) { startHideTimer(); return true; }
        return v;
      });
    }
  }, [seek, startHideTimer, showCenterBriefly]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    v.paused ? v.play().then(() => setPlaying(true)).catch(() => {}) : (v.pause(), setPlaying(false));
    startHideTimer();
  }, [startHideTimer]);

  const seek = useCallback((dir) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir * 10));
  }, []);

  const changeRate = useCallback((r) => {
    if (videoRef.current) videoRef.current.playbackRate = r;
    setRate(r); setShowRate(false); startHideTimer();
  }, [startHideTimer]);

  const changeVolume = useCallback((v) => {
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
    setVolume(v); setMuted(v === 0);
  }, []);

  const prevVolumeRef = useRef(1);

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

  const toggleFS = useCallback(async () => {
    const el = document.querySelector('.player-wrap');
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

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFS(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'ArrowLeft': e.preventDefault(); seek(-1); break;
        case 'ArrowRight': e.preventDefault(); seek(1); break;
        case 'ArrowUp': e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
        case 'ArrowDown': e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
        case 'Escape': if (document.fullscreenElement) document.exitFullscreen(); break;
        case 'p': e.preventDefault(); togglePiP(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, toggleFS, toggleMute, togglePiP, seek, volume, changeVolume]);

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

  const handleProgressTouchStart = useCallback((e) => {
    e.preventDefault();
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    v.currentTime = v.duration * pct;
  }, []);

  const handleProgressTouchMove = useCallback((e) => {
    e.preventDefault();
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    v.currentTime = v.duration * pct;
    setHoverTime(v.duration * pct);
    setHoverX(touch.clientX - rect.left);
  }, []);

  const handleVideoDblClick = useCallback((e) => {
    e.preventDefault();
    toggleFS();
  }, [toggleFS]);

  const handleRetry = useCallback(() => { setError(''); loadData(); }, [loadData]);

  if (error) return (
    <div className="player-error">
      <div>
        <p style={{ margin: '0 0 16px' }}>{error}</p>
        <button className="player-back-btn" onClick={handleRetry}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Retry
        </button>
      </div>
    </div>
  );

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="player-wrap" style={{ cursor: showControls ? 'default' : 'none' }}>
      <div className={`player-top-bar ${showControls ? 'visible' : 'hidden'}`}>
        <button className="player-back-btn" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/'); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <span className="player-title">{title}</span>
      </div>

      <div className="player-video-area"
        onMouseMove={startHideTimer} onClick={togglePlay}
        onDoubleClick={handleVideoDblClick}
        onTouchEnd={handleTap}
      >
        {!src ? (
          <div className="player-loading">
            <div className="player-spinner" />
            <span>Loading player...</span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={src}
              autoPlay
              playsInline
              className="player-video"
              onClick={e => e.stopPropagation()}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
              onError={() => setError('Failed to play this video')}
              onEnded={() => {
                if (nextEp && type === 'series') {
                  navigate(`/play/series/${id}?season=${nextEp.season}&episode=${nextEp.episode}`, { replace: true });
                }
              }}
            />
            <div className={`player-center-btns ${showCenterBtns ? 'visible' : ''}`}>
              <button className="player-center-btn" onClick={e => { e.stopPropagation(); seek(-1); showCenterBriefly(); }} title="Rewind 10s">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
              </button>
              <button className="player-center-btn" onClick={e => { e.stopPropagation(); togglePlay(); }} title={playing ? 'Pause' : 'Play'}>
                {playing ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="8,5 19,12 8,19"/>
                  </svg>
                )}
              </button>
              <button className="player-center-btn" onClick={e => { e.stopPropagation(); seek(1); showCenterBriefly(); }} title="Forward 10s">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`player-bottom-controls ${showControls ? 'visible' : 'hidden'}`}>
        {src && (
          <>
            <div className="player-progress-wrap" ref={progressRef}
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
            >
              <div className="player-progress-track">
                <div className="player-progress-buffer" style={{ width: `${bufferPct}%` }} />
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

              <span className="player-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

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
                  {isFullscreen
                    ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>
                    : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>
                  }
                </svg>
              </button>
            </div>

            {nextEp && type === 'series' && src && (
              <div className="player-next-hint">
                Next: Episode {nextEp.episode} — {nextEp.title || `Episode ${nextEp.episode}`} (auto-plays when current ends)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
