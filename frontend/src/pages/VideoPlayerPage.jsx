import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { seriesService } from '../services/seriesService';

const API_BASE = (import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '');

export default function VideoPlayerPage() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    async function load() {
      try {
        if (type === 'movie') {
          const item = await moviesService.getById(id);
          if (item?.videoUrl) {
            setSrc(`/media${item.videoUrl}`);
            setTitle(item.title || 'Movie');
          }
        } else if (type === 'series') {
          const item = await seriesService.getById(id);
          const seasonNum = Number(searchParams.get('season')) || 1;
          const episodeNum = Number(searchParams.get('episode')) || 1;
          for (const s of item?.seasons || []) {
            if (s.number === seasonNum || Number(s.id) === seasonNum) {
              const ep = (s.episodes || []).find(
                (e) => e.number === episodeNum || Number(e.id) === episodeNum
              );
              if (ep?.videoUrl) {
                setSrc(`/media${ep.videoUrl}`);
                setTitle(ep.title || `Episode ${episodeNum}`);
                return;
              }
            }
          }
        }
      } catch { /* ignore */ }
    }
    load();
  }, [type, id, searchParams]);

  if (!src) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#000', color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif',
      }}>
        <p>Loading player...</p>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 24px', background: 'rgba(0,0,0,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
            padding: '8px', borderRadius: 8, fontSize: '1.2rem',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          src={src}
          controls
          autoPlay
          style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }}
          onError={() => window.location.href = src}
        />
      </div>
    </div>
  );
}
