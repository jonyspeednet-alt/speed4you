/**
 * Convert a stored content `videoUrl` into a playable <video> src.
 *
 * - Full URLs (http:// or https://) are used as-is.
 * - Relative paths are served through the site's nginx `/media` location.
 */
export function toPlayableSrc(videoUrl) {
  if (!videoUrl) return '';
  if (/^https?:\/\//i.test(videoUrl)) return videoUrl;
  return `/media${videoUrl}`;
}
