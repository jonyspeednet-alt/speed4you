import { Link } from 'react-router-dom';
import { readStorage, removeStorage } from '../../utils/storage';

export default function SiteFooter() {
  const signedIn = Boolean(readStorage('token'));
  let isAdmin = false;
  try { isAdmin = ['admin', 'super_admin'].includes(JSON.parse(readStorage('user') || 'null')?.role); } catch { /* Invalid stored profile. */ }
  return (
    <footer className="simple-footer">
      <span>Speed4You</span>
      <nav aria-label="More links">
        <Link to="/watchlist">My list</Link>
        {!signedIn && <Link to="/login">Account</Link>}
        {isAdmin && <Link to="/admin">Admin</Link>}
        {signedIn && <button type="button" onClick={() => { removeStorage('token'); removeStorage('user'); window.location.assign(import.meta.env.BASE_URL || '/'); }}>Sign out</button>}
        <a href="https://data.speed4you.net/Software/" target="_blank" rel="noopener noreferrer">Software</a>
        <a href={`${import.meta.env.BASE_URL}speed4you.apk`} download>Android app</a>
        <a href="https://bokasoka.net" target="_blank" rel="noopener noreferrer">Bokasoka</a>
        <a href="https://cinemabazar.net" target="_blank" rel="noopener noreferrer">Cinemabazar</a>
      </nav>
    </footer>
  );
}
