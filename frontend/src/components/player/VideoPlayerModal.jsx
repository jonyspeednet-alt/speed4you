import { useCallback, useEffect, useRef, useState } from 'react';

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

  const startHideTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => { setShowControls(false); setShowRate(false); }, 3000);
  }, []);

  useEffect(() => { startHideTimer(); return () => clearTimeout(controlsTimer.current); }, [startHideTimer]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    v.paused ? v.play().then(() => setPlaying(true)).catch(() => {}) : (v.pause(), setPlaying(false));
    startHideTimer();
  }, [startHideTimer]);

  const toggleFS = useCallback(async () => {
    const el = document.querySelector('.modal-player-wrap');
    if (!el) return;
    try { document.fullscreenElement ? await document.exitFullscreen() : await el.requestFullscreen(); } catch {}
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current; if (!v) return;
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await v.requestPictureInPicture(); } catch {}
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFS(); break;
        case 'm': e.preventDefault(); if (videoRef.current) { const v=videoRef.current; v.muted=!v.muted; setMuted(v.muted); } break;
        case 'Escape': e.preventDefault(); onClose?.(); break;
        case 'p': e.preventDefault(); togglePiP(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, toggleFS, togglePiP, onClose]);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  const [time, setTime] = useState({ cur:0, dur:0 });
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const update = () => setTime({ cur: v.currentTime, dur: v.duration });
    v.addEventListener('timeupdate', update);
    v.addEventListener('loadedmetadata', update);
    return () => { v.removeEventListener('timeupdate', update); v.removeEventListener('loadedmetadata', update); };
  }, []);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99999, background:'#000',
      display:'flex', flexDirection:'column', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      cursor: showControls ? 'default' : 'none',
    }} className="modal-player-wrap">

      {/* Top bar */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, zIndex:10, padding:'12px 20px',
        background: showControls ? 'linear-gradient(rgba(0,0,0,0.7),transparent)' : 'none',
        opacity: showControls ? 1 : 0, transition:'opacity 0.3s',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#fff',cursor:'pointer',padding:'6px 10px',borderRadius:8,display:'flex',alignItems:'center',gap:6,fontSize:'0.9rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span style={{ color:'rgba(255,255,255,0.85)',fontSize:'0.95rem',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{title}</span>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',cursor:'pointer',width:36,height:36,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:'1.2rem' }}>
          ✕
        </button>
      </div>

      {/* Video */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onMouseMove={startHideTimer} onClick={togglePlay}
      >
        {error ? (
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'1rem' }}>{error}</div>
        ) : (
          <video
            ref={videoRef}
            src={src}
            autoPlay playsInline
            style={{ maxWidth:'100%', maxHeight:'100%', width:'100%', height:'100%', objectFit:'contain' }}
            onClick={e => e.stopPropagation()}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onError={() => setError('Failed to play')}
            onEnded={() => { if (onNext) setTimeout(onNext, 1500); }}
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
        <div style={{ marginBottom:10 }}>
          <input type="range" min={0} max={1} step={0.001} defaultValue={0}
            onInput={e => { const v=videoRef.current; if(v && v.duration) v.currentTime = v.duration * parseFloat(e.target.value); }}
            onMouseDown={() => { const v=videoRef.current; if(v) v.pause(); }}
            onMouseUp={e => { const v=videoRef.current; if(v && v.duration) { v.currentTime=v.duration*parseFloat(e.target.value); v.play().catch(()=>{}); }}}
            style={{ width:'100%', height:4, cursor:'pointer', accentColor:'var(--accent-cyan,#00ffff)' }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <button onClick={e => { e.stopPropagation(); togglePlay(); }} style={ctrlBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              {playing ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                : <polygon points="8,5 19,12 8,19"/>}
            </svg>
          </button>
          <span style={{ color:'rgba(255,255,255,0.7)',fontSize:'0.82rem',minWidth:90,fontVariantNumeric:'tabular-nums' }}>
            {formatTime(time.cur)} / {formatTime(time.dur)}
          </span>
          <button onClick={e => { e.stopPropagation(); if(videoRef.current){const v=videoRef.current;v.muted=!v.muted;setMuted(v.muted);} }} style={ctrlBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              {muted || volume === 0
                ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/></>
                : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
              }
            </svg>
          </button>
          <div style={{ flex:1 }} />
          <div style={{ position:'relative' }}>
            <button onClick={e => { e.stopPropagation(); setShowRate(v=>!v); }} style={{ ...ctrlBtn, fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.7)' }}>
              {rate}x
            </button>
            {showRate && (
              <div style={{ position:'absolute',bottom:'100%',right:0,background:'rgba(30,30,30,0.95)',borderRadius:8,padding:6,marginBottom:6,display:'flex',flexDirection:'column',gap:2 }}>
                {RATES.map(r => (
                  <button key={r} onClick={() => { if(videoRef.current) videoRef.current.playbackRate = r; setRate(r); setShowRate(false); startHideTimer(); }}
                    style={{ ...ctrlBtn, background:rate===r?'rgba(0,255,255,0.15)':'none',padding:'4px 16px',justifyContent:'center',fontSize:'0.82rem',color:rate===r?'var(--accent-cyan,#00ffff)':'rgba(255,255,255,0.7)' }}>
                    {r}x
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); togglePiP(); }} style={ctrlBtn} title="Picture in Picture">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2"/><rect x="11" y="9" width="11" height="8" rx="1"/>
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); toggleFS(); }} style={ctrlBtn} title="Fullscreen (f)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </div>
        {onNext && (
          <div style={{ marginTop:8, fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
            Next: auto-plays when current ends
          </div>
        )}
      </div>
    </div>
  );
}

const ctrlBtn = {
  background:'none', border:'none', color:'#fff', cursor:'pointer',
  padding:'6px 8px', borderRadius:8, display:'flex', alignItems:'center',
  gap:6, fontSize:'0.82rem', transition:'all 0.15s',
};
