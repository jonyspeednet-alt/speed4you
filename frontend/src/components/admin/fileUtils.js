/**
 * Shared admin file helpers (kept separate so FileBrowser.jsx only
 * exports a component — required for React fast refresh).
 */
export function titleFromFilename(name) {
  const cleaned = name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bS\d{2}E\d+\b.*$/i, '')
    .replace(/\bS\d{2}\b.*$/i, '')
    .replace(/.*?\b(?:E\d+)\b.*$/i, '')
    .replace(/\b\d{3,4}p\b/gi, '')
    .replace(/\b(?:WEB-DL|WEBRip|BluRay|HDTV|HDRip|DVDRip|x264|x265|h264|h265|AAC|DD5[.]1|DDP5[.]1|AC3)\b/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || name;
}
