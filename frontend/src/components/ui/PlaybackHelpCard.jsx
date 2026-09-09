export default function PlaybackHelpCard({ style = {} }) {
  return (
    <div style={{ ...cardStyles.container, ...style }}>
      <div style={cardStyles.iconWrap}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div style={cardStyles.textWrap}>
        <div style={cardStyles.title}>প্লেব্যাক বা সাউন্ডে সমস্যা হচ্ছে?</div>
        <p style={cardStyles.desc}>
          অনেক ভিডিওর অডিও ফরম্যাট (AC3/5.1) অথবা হাই-কোয়ালিটি কোডেক ব্রাউজারে সরাসরি চলে না। সাউন্ড না আসলে বা প্লে হতে সমস্যা হলে অনুগ্রহ করে <strong>Download</strong> করে <strong>VLC Media Player</strong> অথবা <strong>MX Player</strong> দিয়ে উপভোগ করুন।
        </p>
      </div>
    </div>
  );
}

const cardStyles = {
  container: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderRadius: '12px',
    background: 'linear-gradient(165deg, rgba(26, 20, 16, 0.8) 0%, rgba(14, 12, 10, 0.9) 100%)',
    border: '1px solid rgba(255, 102, 0, 0.3)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 119, 0, 0.2)',
    backdropFilter: 'blur(12px)',
    marginTop: '16px',
    maxWidth: '680px',
  },
  iconWrap: {
    flexShrink: 0,
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: 'rgba(255, 102, 0, 0.15)',
    border: '1px solid rgba(255, 102, 0, 0.35)',
    boxShadow: '0 2px 8px rgba(255, 102, 0, 0.2)',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontWeight: '800',
    fontSize: '0.92rem',
    color: '#ff9933',
    marginBottom: '4px',
    letterSpacing: '0.01em',
  },
  desc: {
    fontSize: '0.85rem',
    color: '#e6ded8',
    lineHeight: '1.55',
    margin: 0,
  },
};
