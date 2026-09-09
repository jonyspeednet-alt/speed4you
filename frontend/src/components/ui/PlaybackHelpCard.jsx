export default function PlaybackHelpCard({ style = {} }) {
  return (
    <div style={{ ...cardStyles.container, ...style }}>
      <div style={cardStyles.iconWrap}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    padding: '14px 18px',
    borderRadius: '12px',
    background: 'rgba(0, 240, 255, 0.04)',
    border: '1px solid rgba(0, 240, 255, 0.18)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(10px)',
    marginTop: '16px',
    maxWidth: '680px',
  },
  iconWrap: {
    flexShrink: 0,
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(0, 240, 255, 0.1)',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: '#00f0ff',
    marginBottom: '4px',
    letterSpacing: '0.01em',
  },
  desc: {
    fontSize: '0.84rem',
    color: '#b8ccdf',
    lineHeight: '1.5',
    margin: 0,
  },
};
