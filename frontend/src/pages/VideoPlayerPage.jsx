import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { seriesService } from '../services/seriesService';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VOL_STEPS = [0, 0.25, 0.5, 0.75, 1];

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
  const [showVol, setShowVol] = useState(false);
  const [error, setError] = useState('');
  const controlsTimer = useRef(null);
  const seasonNum = Number(sp.get('season')) || 1;
  const episodeNum = Number(sp.get('episode')) || 1;

  const loadData = useCallback(async () => {
    try {
      if (type === 'movie') {
        const d = await moviesService.getById(id);
        if (d?.videoUrl) { setSrc(`/media${d.videoUrl}`); setTitle(d.title || 'Movie'); setItem(d); }
      } else if (type === 'series') {
        const d = await seriesService.getById(id);
        setItem(d);
        for (const s of d?.seasons || []) {
          if (s.number === seasonNum || Number(s.id) === seasonNum) {
            const ep = (s.episodes || []).find(e => e.number === episodeNum || Number(e.id) === episodeNum);
            if (ep?.videoUrl) { setSrc(`/media${ep.videoUrl}`); setTitle(ep.title || `Episode ${episodeNum}`); }
            break;
          }
        }
      }
    } catch { setError('Failed to load media'); }
  }, [type, id, seasonNum, episodeNum]);
  useEffect(() => { loadData(); }, [loadData]);

  const getNextEpisode = useCallback(() => {
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

  const nextEp = getNextEpisode();

  const startHideTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => { setShowControls(false); setShowRate(false); setShowVol(false); }, 3000);
  }, []);

  useEffect(() => { startHideTimer(); return () => clearTimeout(controlsTimer.current); }, [startHideTimer]);

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

  const toggleMute = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.muted || volume === 0) { v.muted = false; v.volume = 0.75; setMuted(false); setVolume(0.75); }
    else { v.muted = true; setMuted(true); }
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

  if (error) return <div style={{ minHeight:'100vh',display:'grid',placeItems:'center',background:'#000',color:'rgba(255,255,255,0.5)',fontFamily:'sans-serif' }}><p>{error}</p></div>;

  return (
    <div className="player-wrap" style={{
      position:'fixed', inset:0, zIndex:9999, background:'#000',
      display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      cursor: showControls ? 'default' : 'none',
    }}>
      {/* Top bar */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, zIndex:10, padding:'12px 20px',
        background: showControls ? 'linear-gradient(rgba(0,0,0,0.7),transparent)' : 'none',
        opacity: showControls ? 1 : 0, transition:'opacity 0.3s',
        display:'flex', alignItems:'center', gap:14,
      }}>
        <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',color:'#fff',cursor:'pointer',padding:'6px 10px',borderRadius:8,display:'flex',alignItems:'center',gap:6,fontSize:'0.9rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.95rem', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</span>
      </div>

      {/* Video */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onMouseMove={startHideTimer} onClick={togglePlay}
      >
        {!src ? (
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'1.1rem' }}>Loading player...</div>
        ) : (
          <video
            ref={videoRef}
            src={src}
            autoPlay
            playsInline
            style={{ maxWidth:'100%', maxHeight:'100%', width:'100%', height:'100%', objectFit:'contain' }}
            onClick={e => e.stopPropagation()}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onError={() => setError('Failed to play this video')}
            onEnded={() => {
              if (nextEp && type === 'series') {
                navigate(`/play/series/${id}?season=${nextEp.season}&episode=${nextEp.episode}`, { replace: true });
              }
            }}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, zIndex:10,
        background: showControls ? 'linear-gradient(transparent,rgba(0,0,0,0.8))' : 'none',
        opacity: showControls ? 1 : 0, transition:'opacity 0.3s',
        padding:'24px 20px 14px',
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom:10 }}>
          <input type="range" min={0} max={1} step={0.001}
            defaultValue={0}
            onInput={e => { const v = videoRef.current; if (v && v.duration) v.currentTime = v.duration * parseFloat(e.target.value); }}
            onMouseDown={e => { const v = videoRef.current; if (v) v.pause(); }}
            onMouseUp={e => { const v = videoRef.current; if (v && v.duration) { v.currentTime = v.duration * parseFloat(e.target.value); v.play().catch(() => {}); }}}
            style={{ width:'100%', height:4, cursor:'pointer', accentColor:'var(--accent-cyan,#00ffff)' }}
          />
        </div>

        {/* Controls row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          {/* Play/Pause */}
          <button onClick={e => { e.stopPropagation(); togglePlay(); }} style={ctrlBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              {playing ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                : <polygon points="8,5 19,12 8,19"/>}
            </svg>
          </button>

          {/* Time */}
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.82rem', minWidth:90, fontVariantNumeric:'tabular-nums' }}>
            <PlayerTime videoRef={videoRef} />
          </span>

          {/* Volume */}
          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:4 }}
            onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}
          >
            <button onClick={e => { e.stopPropagation(); toggleMute(); }} style={ctrlBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                {muted || volume === 0
                  ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/></>
                  : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                }
              </svg>
            </button>
            {showVol && (
              <div style={{ position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', background:'rgba(30,30,30,0.95)', borderRadius:8, padding:'8px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, marginBottom:6 }}>
                {VOL_STEPS.map(v => (
                  <button key={v} onClick={() => changeVolume(v)} style={{ ...ctrlBtn, background: volume === v ? 'rgba(0,255,255,0.2)' : 'none', width:40, justifyContent:'flex-start' }}>
                    <span style={{ fontSize:'0.72rem', color: volume >= v ? 'var(--accent-cyan,#00ffff)' : 'rgba(255,255,255,0.4)' }}>{Math.round(v * 100)}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex:1 }} />

          {/* Speed */}
          <div style={{ position:'relative' }}>
            <button onClick={e => { e.stopPropagation(); setShowRate(v => !v); setShowVol(false); }} style={{ ...ctrlBtn, color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', fontWeight:600 }}>
              {rate}x
            </button>
            {showRate && (
              <div style={{ position:'absolute', bottom:'100%', right:0, background:'rgba(30,30,30,0.95)', borderRadius:8, padding:6, marginBottom:6, display:'flex', flexDirection:'column', gap:2 }}>
                {RATES.map(r => (
                  <button key={r} onClick={() => changeRate(r)} style={{ ...ctrlBtn, background: rate === r ? 'rgba(0,255,255,0.15)' : 'none', padding:'4px 16px', justifyContent:'center', fontSize:'0.82rem', color: rate === r ? 'var(--accent-cyan,#00ffff)' : 'rgba(255,255,255,0.7)' }}>
                    {r}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PiP */}
          <button onClick={e => { e.stopPropagation(); togglePiP(); }} style={ctrlBtn} title="Picture in Picture">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2"/><rect x="11" y="9" width="11" height="8" rx="1"/>
            </svg>
          </button>

          {/* Fullscreen */}
          <button onClick={e => { e.stopPropagation(); toggleFS(); }} style={ctrlBtn} title="Fullscreen (f)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {document?.fullscreenElement
                ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>
                : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>
              }
            </svg>
          </button>
        </div>

        {/* Next episode hint */}
        {nextEp && type === 'series' && src && (
          <div style={{ marginTop:8, fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
            Next: Episode {nextEp.episode} — {nextEp.title || `Episode ${nextEp.episode}`} (auto-plays when current ends)
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerTime({ videoRef }) {
  const [t, setT] = useState({ cur:0, dur:0 });
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const update = () => setT({ cur: v.currentTime, dur: v.duration });
    v.addEventListener('timeupdate', update);
    v.addEventListener('loadedmetadata', update);
    return () => { v.removeEventListener('timeupdate', update); v.removeEventListener('loadedmetadata', update); };
  }, [videoRef]);
  const fmt = (s) => { if (!s || !isFinite(s)) return '0:00'; const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60); return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`; };
  return <>{fmt(t.cur)} / {fmt(t.dur)}</>;
}

const ctrlBtn = {
  background:'none', border:'none', color:'#fff', cursor:'pointer',
  padding:'6px 8px', borderRadius:8, display:'flex', alignItems:'center',
  gap:6, fontSize:'0.82rem', transition:'all 0.15s',
};
