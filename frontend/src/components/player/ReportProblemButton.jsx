import { useState } from 'react';
import apiClient from '../../services/apiClient';

const ISSUES = [
  { id: 'no_sound', label: 'সাউন্ড আসছে না' },
  { id: 'no_video', label: 'ভিডিও চলছে না' },
  { id: 'buffering', label: 'আটকে আটকে চলছে' },
  { id: 'wrong_content', label: 'ভুল ভিডিও চলছে' },
  { id: 'other', label: 'অন্য সমস্যা' },
];

export default function ReportProblemButton({ contentType, contentId, season, episode, style }) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('no_sound');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!contentId) return null;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      await apiClient('/reports', {
        method: 'POST',
        body: JSON.stringify({ contentType, contentId, season, episode, issueType, note: note.trim() }),
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setNote('');
        setIssueType('no_sound');
      }, 2200);
    } catch (e) {
      setError(e?.message || 'রিপোর্ট পাঠানো যায়নি, আবার চেষ্টা করুন');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="প্লেব্যাক সমস্যা জানান"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
          color: '#fcd34d', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer',
          whiteSpace: 'nowrap', ...style,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        সমস্যা জানান
      </button>

      {open && (
        <div
          onClick={(e) => { e.stopPropagation(); if (!sending) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px', borderRadius: '14px',
              background: '#141a26', border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px', color: '#f1f5f9',
            }}
          >
            {done ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>ধন্যবাদ!</div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>আপনার রিপোর্ট পেয়েছি, দ্রুত ঠিক করা হবে।</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: '800', fontSize: '0.95rem', marginBottom: '4px' }}>কী সমস্যা হচ্ছে?</div>
                <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginBottom: '12px' }}>জানালে আমরা ফাইলটি ঠিক করে দেবো।</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {ISSUES.map((opt) => (
                    <label key={opt.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', borderRadius: '9px', cursor: 'pointer', fontSize: '0.84rem',
                      border: `1px solid ${issueType === opt.id ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                      background: issueType === opt.id ? 'rgba(245,158,11,0.1)' : 'transparent',
                    }}>
                      <input type="radio" name="report-issue" checked={issueType === opt.id} onChange={() => setIssueType(opt.id)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="বিস্তারিত (ঐচ্ছিক)"
                  maxLength={300}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '9px', marginBottom: '12px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {error && <div style={{ color: '#fca5a5', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => !sending && setOpen(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '9px', cursor: 'pointer',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#94a3b8', fontWeight: '700', fontSize: '0.82rem',
                    }}
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={submit} disabled={sending}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '9px', cursor: sending ? 'wait' : 'pointer',
                      background: '#f59e0b', border: 'none',
                      color: '#1a1207', fontWeight: '800', fontSize: '0.82rem',
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    {sending ? 'পাঠাচ্ছি…' : 'রিপোর্ট পাঠান'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
