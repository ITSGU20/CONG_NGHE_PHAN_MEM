import { resolveContent, track, LANGUAGES, FLOORS, DEFAULT_FLOOR, floorName, floorOf, type Poi } from '@ddl/shared';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import MapView from '../components/MapView';
import { useApp } from '../context';
import { colors, common } from '../theme';

/** UC2 – Bản đồ toàn màn hình; chạm số để mở điểm. Có chuyển sang danh sách (A1) */
export default function MapScreen() {
  const { lang, setLang, pois, loaded, loadError, reload, heard, tr, go } = useApp();
  const [showList, setShowList] = useState(false);

  const [floor, setFloor] = useState(DEFAULT_FLOOR);
  const floorPois = pois.filter((p) => floorOf(p) === floor);

  const open = (p: Poi, how: 'map' | 'list') => {
    track('poi_open', { poiId: p.id, how });
    go('poi', p.id);
  };
  const nextLang = () => {
    const i = LANGUAGES.findIndex((l) => l.code === lang);
    setLang(LANGUAGES[(i + 1) % LANGUAGES.length].code);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' }}>
        <Pressable style={[common.btn, { flex: 1 }]} onPress={() => setShowList(!showList)}>
          <Text style={common.btnText}>{showList ? tr('navMap') : tr('list')}</Text>
        </Pressable>
        <Pressable style={common.btn} onPress={nextLang}>
          <Text style={common.btnText}>{lang.toUpperCase()}</Text>
        </Pressable>
      </View>
      <View style={{ height: 52 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: 'center' }}>
      {FLOORS.map((f) => (
      <Pressable key={f.id} onPress={() => setFloor(f.id)} style={[common.btn, f.id === floor && common.btnPrimary]}>
        <Text style={f.id === floor ? common.btnTextPrimary : common.btnText}>{floorName(f.id, lang)}</Text>
      </Pressable>
    ))}
  </ScrollView>
</View>
      {!loaded && <Text style={[common.muted, { padding: 16 }]}>{tr('loading')}</Text>}
      {loaded && loadError && pois.length === 0 && (
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={common.notice}>{tr('loadError')}</Text>
          <Pressable style={[common.btn, common.btnPrimary]} onPress={reload}><Text style={common.btnTextPrimary}>{tr('retry')}</Text></Pressable>
        </View>
      )}

      {showList ? (
        <FlatList
         data={floorPois}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => {
            const r = resolveContent(item.published, lang);
            return (
              <Pressable style={[common.btn, { flexDirection: 'row', justifyContent: 'flex-start', gap: 12, padding: 10 }]} onPress={() => open(item, 'list')}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: heard.has(item.id) ? colors.ok : colors.brand }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{item.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.fg }}>{r.content?.name}</Text>
                  <Text style={common.muted} numberOfLines={1}>{r.content?.description}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <MapView floor={floor} pois={pois} heard={heard} onPick={(p) => open(p, 'map')} />
      )}
    </View>
  );
}
