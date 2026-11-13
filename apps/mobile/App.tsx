import {
  getVisitorPois, startSession, storage, t, track,
  type LangCode, type Poi,
} from '@ddl/shared';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import LanguageScreen from './src/screens/LanguageScreen';
import MapScreen from './src/screens/MapScreen';
import PoiScreen from './src/screens/PoiScreen';
import { AppContext, type AppCtx } from './src/context';

type Screen = { name: 'language' } | { name: 'map' } | { name: 'poi'; id: string };

/** Điều hướng đơn giản bằng state (đủ cho 4 màn hình); có thể thay bằng React Navigation sau */
export default function App() {
  const [lang, setLangState] = useState<LangCode | null>(() => storage.get('ddl.lang') as LangCode | null);
  const [screen, setScreen] = useState<Screen>(() => (storage.get('ddl.lang') ? { name: 'map' } : { name: 'language' }));
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
  // NFR-11: nội dung vừa xuất bản phải tới du khách khi mở điểm; app mở lâu thì làm mới khi chuyển màn hình
  useEffect(() => {
    if (Date.now() - lastLoad.current > 60_000) reload();
  }, [screen, reload]);

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

  const ctx = useMemo<AppCtx>(
    () => ({
      lang: lang ?? 'vi',
      setLang,
      pois,
      loaded,
      loadError,
      reload,
      heard,
      markHeard,
      tr: (k) => t(lang ?? 'vi', k),
      go: (name, id) => setScreen(name === 'poi' ? { name, id: id! } : ({ name } as Screen)),
    }),
    [lang, setLang, pois, loaded, loadError, reload, heard, markHeard],
  );

  return (
    <AppContext.Provider value={ctx}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {screen.name === 'language' && <LanguageScreen />}
        {screen.name === 'map' && <MapScreen />}
        {screen.name === 'poi' && <PoiScreen key={screen.id + ctx.lang} poiId={screen.id} />}
      </SafeAreaView>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#0c1120' } });
