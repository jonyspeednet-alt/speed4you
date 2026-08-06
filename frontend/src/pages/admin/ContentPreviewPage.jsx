import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { moviesService, seriesService } from '../../services';
import MovieDetailsPage from '../MovieDetailsPage';
import SeriesDetailsPage from '../SeriesDetailsPage';
import { ToastProvider } from '../../components/ui/Toast.jsx';

function ContentPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        setError(null);
        
        // Try movie first, then series
        let data;
        try {
          data = await moviesService.getPreview(id);
        } catch {
          try {
            data = await seriesService.getPreview(id);
          } catch (err) {
            throw new Error('Content not found');
          }
        }
        
        setContent(data);
      } catch (err) {
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchContent();
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: 'rgba(255,255,255,0.72)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase'
      }}>
        Loading...
      </div>
    );
  }

  if (error || !content) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: 'rgba(255,255,255,0.72)',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h2 style={{ marginBottom: '16px' }}>Content Not Found</h2>
          <p style={{ marginBottom: '24px' }}>{error || 'The requested content could not be loaded.'}</p>
          <button
            onClick={() => navigate('/admin/content')}
            style={{
              padding: '10px 20px',
              background: 'var(--accent-primary, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Back to Content Library
          </button>
        </div>
      </div>
    );
  }

  // Render the appropriate details page with admin preview context
  if (content.type === 'series') {
    return (
      <ToastProvider>
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 9999,
            fontSize: '0.9rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <span>Admin Preview · Draft Content</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span style={{ fontWeight: '400', opacity: 0.9 }}>Status: {content.status}</span>
            <button
              onClick={() => navigate('/admin/content')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Back to Library
            </button>
          </div>
          <div style={{ marginTop: '56px' }}>
            <SeriesDetailsPage adminPreview contentData={content} />
          </div>
        </>
      </ToastProvider>
    );
  }
  
  return (
    <ToastProvider>
      <>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 9999,
          fontSize: '0.9rem',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <span>Admin Preview · Draft Content</span>
          <span style={{ opacity: 0.8 }}>|</span>
          <span style={{ fontWeight: '400', opacity: 0.9 }}>Status: {content.status}</span>
          <button
            onClick={() => navigate('/admin/content')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Back to Library
          </button>
        </div>
        <div style={{ marginTop: '56px' }}>
          <MovieDetailsPage adminPreview contentData={content} />
        </div>
      </>
    </ToastProvider>
  );
}

export default ContentPreviewPage;
