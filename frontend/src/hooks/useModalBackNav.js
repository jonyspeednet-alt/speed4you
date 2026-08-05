import { useCallback, useEffect, useRef } from 'react';

const MARKER = '__portalModal';

export function useModalBackNav(onClose, enabled = true) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => {
    if (window.history.state && window.history.state[MARKER]) {
      window.history.back();
    } else {
      onCloseRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const handlePop = () => onCloseRef.current?.();
    window.addEventListener('popstate', handlePop);
    window.history.pushState({ [MARKER]: true }, '');
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (window.history.state && window.history.state[MARKER]) {
        window.history.back();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [enabled]);

  return close;
}

export default useModalBackNav;
