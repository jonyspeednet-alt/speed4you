export function triggerDownload(url) {
  document.querySelectorAll('video').forEach((v) => {
    try {
      v.pause();
    } catch { /* intentionally ignored: video may already be stopped */ }
  });
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
