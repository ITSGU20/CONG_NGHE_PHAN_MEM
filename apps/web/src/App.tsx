import { getVisitorPois, startSession, storage, t, track, type LangCode, type Poi } from '@ddl/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import HomePage from './pages/HomePage';
import LanguagePage from './pages/LanguagePage';
import MapPage from './pages/MapPage';
import PoiPage from './pages/PoiPage';

interface Ctx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  pois: Poi[];
  /** đã tải xong danh sách điểm (thành công hoặc lỗi) */
  loaded: boolean;
  /** UC3 E2: lỗi tải nội dung hoặc mạng yếu */
  loadError: boolean;
  reload: () => void;
  heard: Set<string>;
  markHeard: (id: string) => void;
  tr: (k: Parameters<typeof t>[1]) => string;
}
const AppCtx = createContext<Ctx>(null as never);
export const useApp = () => useContext(AppCtx);

export default function App() {
  const [lang, setLangState] = useState<LangCode | null>(() => storage.get('ddl.lang') as LangCode | null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const lastLoad = useRef(0);
  const [heard, setHeard] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(storage.get('ddl.heard') ?? '[]'));
    } catch {
      return new Set();
    }
  });
  const location = useLocation();

  useEffect(() => startSession(lang ?? 'vi'), []); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => {
    lastLoad.current = Date.now();
    getVisitorPois().then(
      (p) => {
        setPois(p);
        setLoadError(false);
        setLoaded(true);
      },
      () => {
        setLoadError(true);
        setLoaded(true);
      },
    );
  }, []);
  useEffect(() => reload(), [reload]);
  // NFR-11: nội dung vừa xuất bản phải tới du khách khi mở điểm hoặc tải lại trang; tab mở lâu thì làm mới khi chuyển trang
  useEffect(() => {
    if (Date.now() - lastLoad.current > 60_000) reload();
  }, [location.pathname, reload]);

  const setLang = useCallback((l: LangCode) => {
    storage.set('ddl.lang', l);
    setLangState(l);
    track('language_select', { lang: l });
  }, []);

  const markHeard = useCallback((id: string) => {
    setHeard((prev) => {
      const next = new Set(prev).add(id);
      storage.set('ddl.heard', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang: lang ?? 'vi', setLang, pois, loaded, loadError, reload, heard, markHeard, tr: (k) => t(lang ?? 'vi', k) }),
    [lang, setLang, pois, loaded, loadError, reload, heard, markHeard],
  );

  // Chưa chọn ngôn ngữ => về màn chọn ngôn ngữ, nhớ đường dẫn đang muốn mở (vd: vào bằng mã QR) rồi quay lại sau
  if (!lang && location.pathname !== '/language') {
    return <Navigate to="/language" state={{ next: location.pathname }} replace />;
  }

  return (
    <AppCtx.Provider value={value}>
      <Routes>
        <Route path="/language" element={<LanguagePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/poi/:id" element={<PoiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppCtx.Provider>
  );
}
