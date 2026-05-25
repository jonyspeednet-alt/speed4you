import { useRef, useState, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const MAX_REMUX_BYTES = 500 * 1024 * 1024;

let ffmpegSingleton = null;
let ffmpegLoadPromise = null;

async function getFFmpeg(onProgress) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on('progress', ({ progress: p }) => {
      if (typeof onProgress === 'function') onProgress(p);
    });

    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ff.load({
      coreURL: await toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm'),
    });
    ffmpegSingleton = ff;
    return ff;
  })();

  return ffmpegLoadPromise;
}

export function useClientRemux() {
  const [status, setStatus] = useState('idle');
  const [pct, setPct] = useState(0);
  const [errMsg, setErrMsg] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const abRef = useRef(null);
  const pctRef = useRef(0);
  const ownedUrlRef = useRef(null);

  useEffect(() => () => {
    if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
  }, []);

  const remux = useCallback(async (sourceUrl) => {
    abRef.current = new AbortController();

    try {
      const head = await fetch(sourceUrl, { method: 'HEAD', signal: abRef.current.signal });
      const size = parseInt(head.headers.get('content-length') || '0', 10);
      if (size > MAX_REMUX_BYTES) {
        return { ok: false, reason: 'too-large', size };
      }
      if (size === 0) {
        return { ok: false, reason: 'no-size' };
      }

      setStatus('loading-ffmpeg');
      setPct(0);

      const ff = await getFFmpeg((p) => {
        const pctNum = Math.round(p * 100);
        if (pctNum > pctRef.current) {
          pctRef.current = pctNum;
          setPct(pctNum);
        }
      });

      setStatus('downloading');
      setPct(0);

      const inputData = await fetchFile(sourceUrl);

      if (abRef.current.signal.aborted) return { ok: false, reason: 'aborted' };

      setStatus('remuxing');
      pctRef.current = 0;
      setPct(0);

      ff.writeFile('input.mkv', inputData);
      await ff.exec(['-i', 'input.mkv', '-c', 'copy', '-movflags', '+faststart', 'output.mp4']);

      const out = await ff.readFile('output.mp4');
      ff.deleteFile('input.mkv');
      ff.deleteFile('output.mp4');

      if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
      const url = URL.createObjectURL(new Blob([out], { type: 'video/mp4' }));
      ownedUrlRef.current = url;
      setBlobUrl(url);
      setStatus('ready');
      return { ok: true, blobUrl: url };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, reason: 'aborted' };
      setStatus('error');
      setErrMsg(e?.message || String(e));
      return { ok: false, reason: 'error', message: e?.message || String(e) };
    }
  }, []);

  const reset = useCallback(() => {
    abRef.current?.abort();
    if (ownedUrlRef.current) {
      URL.revokeObjectURL(ownedUrlRef.current);
      ownedUrlRef.current = null;
    }
    setStatus('idle');
    setPct(0);
    setErrMsg(null);
    setBlobUrl(null);
  }, []);

  return { status, progress: pct, error: errMsg, blobUrl, remux, reset };
}
