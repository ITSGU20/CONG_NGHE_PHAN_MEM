import { LANGUAGES } from '@ddl/shared';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

/** UC1 – Chọn ngôn ngữ */
export default function LanguagePage() {
  const { setLang, tr } = useApp();
  const nav = useNavigate();
  const next = (useLocation().state as { next?: string } | null)?.next;

  return (
    <main className="center">
      <h1>{tr('chooseLang')}</h1>
      <div className="lang-grid">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            className="btn big"
            onClick={() => {
              setLang(l.code);
              // vào bằng mã QR (/poi/...) thì quay lại đúng điểm đó, còn lại vào bản đồ (UC1 bước 5)
              nav(next && next !== '/' && next !== '/language' ? next : '/map', { replace: true });
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </main>
  );
}
