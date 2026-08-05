import { useEffect, useRef, useCallback } from 'react';
import { useModalBackNav } from '../../hooks';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const ACCENT = 'var(--accent-primary, #6366f1)';

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const closeDialog = useModalBackNav(onClose, isOpen);

  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeDialog();
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll('button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [closeDialog]);

  if (!isOpen) return null;
  return (
    <div style={styles.overlay} onClick={closeDialog} onKeyDown={handleKeyDown}>
      <div style={styles.modal} onClick={e => e.stopPropagation()} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h3 style={styles.title} id="confirm-dialog-title">{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button ref={cancelRef} onClick={closeDialog} style={styles.cancelBtn}>{cancelText}</button>
          <button onClick={onConfirm} style={styles.confirmBtn}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: SURFACE, borderRadius: '10px',
    padding: '18px', maxWidth: '400px', width: '90%',
    border: `1px solid ${BORDER}`,
  },
  title: { fontSize: '1rem', fontWeight: '700', color: TEXT, margin: '0 0 8px 0' },
  message: { color: TEXT2, fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: '1.5' },
  actions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '7px 14px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '8px', color: TEXT, fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' },
  confirmBtn: { padding: '7px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' },
};

export default ConfirmDialog;
