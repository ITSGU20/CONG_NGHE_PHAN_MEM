import { LANGUAGES, type LangCode } from '@ddl/shared';
import { Link, NavLink } from 'react-router-dom';
import { useApp } from '../App';
import { IconGlobe } from './icons';

/** Trang quản trị nằm cùng site: /<repo>/admin/ khi đã deploy, cổng 5174 khi chạy thử */
const ADMIN_URL = import.meta.env.DEV ? 'http://localhost:5174/' : `${import.meta.env.BASE_URL}admin/`;

export default function Header() {
  const { lang, setLang, tr } = useApp();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="logo" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 10 12 4l9 6M5 10v9h14v-9M8 19v-6M12 19v-6M16 19v-6M3 19h18" />
          </svg>
        </span>
        {tr('brand')}
      </Link>
      <nav className="mainnav">
        <NavLink to="/" end>{tr('navHome')}</NavLink>
        <NavLink to="/map">{tr('navMap')}</NavLink>
        <NavLink to="/about">{tr('navAbout')}</NavLink>
        <a href={ADMIN_URL}>{tr('navAdmin')}</a>
      </nav>
      <label className="langsel">
        <IconGlobe size={18} />
        <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)} aria-label={tr('chooseLang')}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </label>
    </header>
  );
}
