export function triggerDownload(url) {
  document.querySelectorAll('video').forEach((v) => {
    try {
      v.pause();
    } catch {}
  });
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
