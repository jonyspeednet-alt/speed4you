import { useState, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * ResponsiveImage Component
 * Automatically serves appropriately sized images based on screen size
 * Supports WebP format with fallback, lazy loading, and accessibility
 */
export default function ResponsiveImage({
  src,
  alt = 'Image',
  srcWebP,
  sizes,
  className = '',
  style = {},
  lazy = true,
  objectFit = 'cover',
  objectPosition = 'center',
  quality = 'auto',
  onLoad,
  onError,
  width,
  height,
  aspectRatio,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { isMobile, isTablet, isDesktop, isTV, is4K } = useResponsive();

  // Generate responsive sizes based on breakpoints
  const getResponsiveSizes = () => {
    if (sizes) return sizes;

    // Default responsive sizes
    return '(max-width: 480px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, (max-width: 1600px) 70vw, 60vw';
  };

  // Generate responsive srcSet
  const getResponsiveSrcSet = () => {
    if (!src) return '';

    const baseUrl = src.split('?')[0];
    const params = new URLSearchParams(src.split('?')[1] || '');

    // Determine image widths based on device capabilities
    const widths = isMobile ? [320, 480, 640] :
                  isTablet ? [480, 768, 1024] :
                  isTV ? [1280, 1600, 1920] :
                  is4K ? [1920, 2560, 3200] :
                  [640, 1024, 1280];

    return widths
      .map(w => {
        params.set('w', w);
        params.set('q', quality === 'auto' ? (w <= 768 ? 75 : 85) : quality);
        return `${baseUrl}?${params.toString()} ${w}w`;
      })
      .join(', ');
  };

  // Preload image
  useEffect(() => {
    if (!lazy) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setError(true);
      img.src = imageSrc;
    }
  }, [imageSrc, lazy]);

  const baseStyle = {
    objectFit,
    objectPosition,
    width: width || '100%',
    height: height || 'auto',
    ...(aspectRatio && { aspectRatio }),
    ...style,
  };

  const imageProps = {
    src: imageSrc,
    alt,
    className: `responsive-image ${isLoaded ? 'loaded' : 'loading'} ${error ? 'error' : ''} ${className}`,
    style: baseStyle,
    onLoad: () => {
      setIsLoaded(true);
      onLoad?.();
    },
    onError: (e) => {
      setError(true);
      onError?.(e);
    },
    loading: lazy ? 'lazy' : 'eager',
    sizes: getResponsiveSizes(),
    ...props,
  };

  // Support WebP format
  if (srcWebP) {
    return (
      <picture>
        <source
          srcSet={getResponsiveSrcSet().replace(src, srcWebP)}
          type="image/webp"
          sizes={getResponsiveSizes()}
        />
        <img {...imageProps} />
      </picture>
    );
  }

  return (
    <img
      {...imageProps}
      srcSet={getResponsiveSrcSet()}
    />
  );
}

/**
 * ResponsiveBackground Component
 * Serves background images at appropriate resolutions
 */
export function ResponsiveBackground({
  src,
  srcWebP,
  alt = 'Background',
  className = '',
  style = {},
  children,
  ...props
}) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Determine background image URL based on breakpoint
  const getBgUrl = () => {
    const baseUrl = src.split('?')[0];
    const params = new URLSearchParams(src.split('?')[1] || '');

    if (isMobile) {
      params.set('w', '480');
      params.set('q', '70');
    } else if (isTablet) {
      params.set('w', '1024');
      params.set('q', '80');
    } else {
      params.set('w', '1920');
      params.set('q', '85');
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const bgStyle = {
    backgroundImage: `url('${getBgUrl()}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    ...style,
  };

  return (
    <div
      className={`responsive-background ${className}`}
      style={bgStyle}
      role="img"
      aria-label={alt}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveVideo Component
 * Adaptive video playback based on screen size and network
 */
export function ResponsiveVideo({
  src,
  sources = [],
  poster,
  className = '',
  style = {},
  autoPlay = false,
  controls = true,
  muted = false,
  loop = false,
  playsInline = true,
  ...props
}) {
  const { isMobile, isTablet } = useResponsive();
  const [hasConnection, setHasConnection] = useState(true);

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setHasConnection(connection.saveData === false);

      const handleChange = () => setHasConnection(connection.saveData === false);
      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener('change', handleChange);
    }
  }, []);

  // Determine video quality based on breakpoint and connection
  const getVideoSources = () => {
    if (sources.length > 0) return sources;

    const isSaveData = !hasConnection;
    const baseUrl = src.split('?')[0];
    const params = new URLSearchParams(src.split('?')[1] || '');

    if (isMobile || isSaveData) {
      params.set('quality', 'low');
      params.set('bitrate', '500k');
    } else if (isTablet) {
      params.set('quality', 'medium');
      params.set('bitrate', '1000k');
    } else {
      params.set('quality', 'high');
      params.set('bitrate', '2500k');
    }

    return [
      {
        src: `${baseUrl}?${params.toString()}`,
        type: 'video/mp4',
      },
    ];
  };

  const videoStyle = {
    width: '100%',
    height: 'auto',
    ...style,
  };

  return (
    <video
      poster={poster}
      className={`responsive-video ${className}`}
      style={videoStyle}
      autoPlay={autoPlay}
      controls={controls}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      {...props}
    >
      {getVideoSources().map((source, idx) => (
        <source key={idx} src={source.src} type={source.type} />
      ))}
      Your browser does not support HTML5 video.
    </video>
  );
}
