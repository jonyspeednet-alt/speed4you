import { useState, useEffect, useRef, useCallback } from 'react';
import { adminService } from '../services';

function useDuplicateDetection(title, type, isEditMode, excludeId) {
  const [liveDuplicates, setLiveDuplicates] = useState(null);
  const dupTimerRef = useRef(null);
  const lastTypeRef = useRef(type);

  useEffect(() => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    const trimmed = title?.trim();
    if (!trimmed || trimmed.length < 2) {
      setLiveDuplicates(null);
      return;
    }
    dupTimerRef.current = setTimeout(() => {
      adminService.checkDuplicateTitle({ title: trimmed, type: type || 'movie', excludeId: isEditMode ? excludeId : undefined })
        .then((res) => { setLiveDuplicates(res?.candidates || []); })
        .catch(() => { setLiveDuplicates(null); });
    }, 500);
    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
  }, [title, type, isEditMode, excludeId]);

  const clearDuplicates = useCallback(() => setLiveDuplicates(null), []);

  return { liveDuplicates, clearDuplicates };
}

export default useDuplicateDetection;
