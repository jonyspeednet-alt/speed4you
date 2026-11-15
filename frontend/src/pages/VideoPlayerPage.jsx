import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Artplayer from 'artplayer';
import { moviesService } from '../services/moviesService';
import { seriesService } from '../services/seriesService';
import { progressService } from '../services/apiClient';
import { contentService } from '../services';
import { toPlayableSrc } from '../utils/mediaUrl';
import ReportProblemButton from '../components/player/ReportProblemButton';
import '../styles/videoPlayer.css';

export default function VideoPlayerPage() {
  const { type, id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const nextEpisodeRef = useRef(null);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const lastSavedRef = useRef(0);
  const viewTrackedRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0 });

  const seasonNum = Number(sp.get('season')) || 1;
  const episodeNum = Number(sp.get('episode')) || 1;

  const loadData = useCallback(async () => {
    setError('');
    setSrc('');
    setTitle('');
    setItem(null);
    try {
      if (type === 'movie') {
        const data = await moviesService.getById(id);
        if (!data?.videoUrl) {
          setError('Video source is not available for this movie');
          return;
        }
        setItem(data);
        setTitle(data.title || 'Movie');
        setSrc(toPlayableSrc(data.videoUrl));
      } else if (type === 'series') {
        const data = await seriesService.getById(id);
        setItem(data);
        let episodeFound = null;
        for (const season of data?.seasons || []) {
          if (season.number === seasonNum || Number(season.id) === seasonNum) {
            episodeFound = (season.episodes || []).find(
              episode => episode.number === episodeNum || Number(episode.id) === episodeNum
            );
            break;
          }
        }
        if (!episodeFound?.videoUrl) {
          setError('Video source is not available for this episode');
          return;
        }
        setTitle(episodeFound.title || `Episode ${episodeNum}`);
        setSrc(toPlayableSrc(episodeFound.videoUrl));
      } else {
        setError('Unsupported media type');
      }
    } catch (loadError) {
      console.error('Failed to load media:', loadError);
      setError('Failed to load media');
    }
  }, [type, id, seasonNum, episodeNum]);

  useEffect(() => {
    lastSavedRef.current = 0;
    viewTrackedRef.current = false;
    loadData();
  }, [loadData]);

  const nextEp = useMemo(() => {
    if (type !== 'series' || !item?.seasons) return null;
    for (const season of item.seasons) {
      if (season.number === seasonNum || Number(season.id) === seasonNum) {
        const episodes = season.episodes || [];
        const index = episodes.findIndex(
          episode => episode.number === episodeNum || Number(episode.id) === episodeNum
        );
        if (index >= 0 && index < episodes.length - 1) {
          const episode = episodes[index + 1];
          return {
            ...episode,
            season: seasonNum,
            episode: episode.number || Number(episode.id),
          };
        }
        if (index >= 0 && index === episodes.length - 1) {
          const nextSeason = item.seasons[item.seasons.indexOf(season) + 1];
          const firstEpisode = nextSeason?.episodes?.[0];
          if (firstEpisode) {
            return {
              ...firstEpisode,
              season: nextSeason.number || Number(nextSeason.id),
              episode: firstEpisode.number || Number(firstEpisode.id),
            };
          }
        }
      }
    }
    return null;
  }, [type, item, seasonNum, episodeNum]);

  useEffect(() => {
    nextEpisodeRef.current = nextEp;
  }, [nextEp]);

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || !type || !id) return;
    const position = Math.floor(video.currentTime);
    const totalDuration = Math.floor(video.duration);
    if (position < 5) return;

    progressService.update(type, id, position, totalDuration).catch(saveError => {
      console.error('Progress save failed:', saveError);
    });
    lastSavedRef.current = position;

    if (!viewTrackedRef.current && position >= 10) {
      viewTrackedRef.current = true;
      contentService.trackView(id).catch(() => {});
    }
    if (position / totalDuration >= 0.95) {
      progressService.markComplete(type, id).catch(markError => {
        console.error('Progress markComplete failed:', markError);
      });
    }
  }, [type, id]);

  useEffect(() => {
    if (!src || !playerContainerRef.current) return undefined;

    let art;
    let video;
    let disposed = false;

    try {
      Artplayer.MOBILE_DBCLICK_PLAY = false;
      art = new Artplayer({
        container: playerContainerRef.current,
        url: src,
        autoplay: true,
        muted: false,
        playsInline: true,
        theme: '#ff6600',
        volume: 1,
        playbackRate: true,
        setting: true,
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        hotkey: false,
        lock: true,
        gesture: true,
        fastForward: true,
        miniProgressBar: true,
        mutex: true,
        autoSize: false,
      });
      playerRef.current = art;
      video = art.video;
      videoRef.current = video;

      if (!video) {
        setError('Player could not initialize the video element');
        return () => art.destroy(false);
      }

      const onTimeUpdate = () => {
        if (Math.floor(video.currentTime) - lastSavedRef.current >= 15) saveProgress();
      };
      const onPause = () => saveProgress();
      const onEnded = () => {
        const next = nextEpisodeRef.current;
        if (next && type === 'series') {
          navigate(
            `/play/series/${id}?season=${next.season}&episode=${next.episode}`,
            { replace: true }
          );
        }
      };
      const onError = () => {
        if (!disposed) setError('Failed to play this video');
      };

      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('pause', onPause);
      video.addEventListener('ended', onEnded);
      video.addEventListener('error', onError);

      return () => {
        disposed = true;
        saveProgress();
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onError);
        if (videoRef.current === video) videoRef.current = null;
        if (playerRef.current === art) playerRef.current = null;
        art.destroy(false);
      };
    } catch (playerError) {
      console.error('Artplayer initialization failed:', playerError);
      setError('Failed to initialize video player');
      return () => {
        if (art) art.destroy(false);
      };
    }
  }, [src, retryKey, saveProgress, type, id, navigate]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = event => {
      const target = event.target;
      if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const art = playerRef.current;
      const video = videoRef.current;
      if (!art || !video) return;
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          break;
        case 'f': event.preventDefault(); art.fullscreen = !art.fullscreen; break;
        case 'm': event.preventDefault(); art.muted = !art.muted; break;
        case 'ArrowLeft': event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); break;
        case 'ArrowRight': event.preventDefault(); video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10); break;
        case 'ArrowUp': event.preventDefault(); art.volume = Math.min(1, art.volume + 0.1); break;
        case 'ArrowDown': event.preventDefault(); art.volume = Math.max(0, art.volume - 0.1); break;
        case 'p': event.preventDefault(); art.pip = !art.pip; break;
        case 'Escape':
          if (art.fullscreen) art.fullscreen = false;
          else if (art.fullscreenWeb) art.fullscreenWeb = false;
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const handleTouchEnd = event => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const now = Date.now();
      const previous = lastTapRef.current;
      if (now - previous.time < 300 && Math.abs(touch.clientX - previous.x) < 60) {
        const rect = video.getBoundingClientRect();
        const direction = touch.clientX > rect.left + rect.width / 2 ? 1 : -1;
        video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + direction * 10));
        lastTapRef.current = { time: 0, x: 0 };
      } else {
        lastTapRef.current = { time: now, x: touch.clientX };
      }
    };
    video.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => video.removeEventListener('touchend', handleTouchEnd);
  }, [src, retryKey]);
  const handleRetry = useCallback(() => {
    setError('');
    if (src) setRetryKey(value => value + 1);
    else loadData();
  }, [src, loadData]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }, [navigate]);

  if (error) {
    return (
      <div className="player-error" style={{ padding: '40px 24px', maxWidth: '580px', margin: '0 auto' }}>
        <div className="player-error-icon" aria-hidden="true">!</div>
        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>
          ভিডিওটি ব্রাউজারে চালানো যাচ্ছে না
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 24px' }}>
          অনেক ভিডিওর অডিও ফরম্যাট অথবা কোডেক ব্রাউজারে সরাসরি সমর্থিত নাও হতে পারে।
          সাউন্ড বা প্লেব্যাক সমস্যা হলে ফাইলটি Download করে VLC Media Player অথবা MX Player দিয়ে চালাতে পারেন।
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="player-back-btn" onClick={handleRetry}>Retry</button>
          <button className="player-back-btn" onClick={handleBack}>Back to Details</button>
          <ReportProblemButton
            contentType={type === 'series' ? 'series' : 'movie'}
            contentId={Number(id) || id}
            season={type === 'series' ? seasonNum : undefined}
            episode={type === 'series' ? episodeNum : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="player-wrap">
      <div className="player-top-bar visible">
        <button className="player-back-btn" onClick={handleBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="player-title">{title}</span>
        <span style={{ flex: 1 }} />
        <ReportProblemButton
          contentType={type === 'series' ? 'series' : 'movie'}
          contentId={Number(id) || id}
          season={type === 'series' ? seasonNum : undefined}
          episode={type === 'series' ? episodeNum : undefined}
        />
        {item?.status === 'draft' && (
          <span className="player-draft-badge">Draft</span>
        )}
      </div>

      <div className="player-video-area">
        {!src ? (
          <div className="player-loading">
            <div className="player-spinner" />
            <span>Loading player...</span>
          </div>
        ) : (
          <div
            ref={playerContainerRef}
            className="artplayer-app"
            aria-label={title || 'Video player'}
          />
        )}
      </div>

      {nextEp && type === 'series' && src && (
        <div className="player-next-hint">
          Next: Episode {nextEp.episode} — {nextEp.title || `Episode ${nextEp.episode}`}
          {' '}(auto-plays when current ends)
        </div>
      )}
    </div>
  );
}
