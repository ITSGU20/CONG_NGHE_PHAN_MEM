import { resolveContent, usePlayer } from '@ddl/shared';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../context';
import { nativeTts, useVoicesReady } from '../tts';
import { colors, common } from '../theme';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const isRemote = (s?: string) => !!s && /^https?:\/\//.test(s);

/** UC3 – Nghe thuyết minh: "Phát" = đọc nội dung thuyết minh thành tiếng */
export default function PoiScreen({ poiId }: { poiId: string }) {
  const { lang, pois, loaded, loadError, reload, heard, markHeard, tr, go } = useApp();
  const poi = pois.find((p) => p.id === poiId);
  const [imgIdx, setImgIdx] = useState(0);
  const [barW, setBarW] = useState(0);
  useVoicesReady();
  const r = resolveContent(poi?.published, lang);
  const paragraphs = (r.content?.narration ?? '').split(/\n\s*\n/).filter((p) => p.trim());
  const player = usePlayer({ poiId, lang: r.textLang ?? lang, selectedLang: lang, paragraphs, engine: nativeTts, onListenValid: () => markHeard(poiId) });

  if (!poi) {
    return (
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={common.muted}>{!loaded ? tr('loading') : loadError ? tr('loadError') : tr('notFound')}</Text>
        {loaded && loadError && (
          <Pressable style={[common.btn, common.btnPrimary]} onPress={reload}><Text style={common.btnTextPrimary}>{tr('retry')}</Text></Pressable>
        )}
        <Pressable style={common.btn} onPress={() => go('map')}><Text style={common.btnText}>{tr('backToMap')}</Text></Pressable>
      </View>
    );
  }

  const images = (poi.published?.images ?? []).filter(isRemote);
  const shown = images[imgIdx] ?? poi.published?.images[0];
  const altOf = (src?: string) => (src && r.content?.captions?.[src]) || r.content?.name || '';
  const pct = player.total ? (player.position / player.total) * 100 : 0;
  const typeLabel = { outdoor: tr('typeOutdoor'), indoor: tr('typeIndoor'), mixed: tr('typeMixed') }[poi.type];
  const next = pois[pois.findIndex((p) => p.id === poiId) + 1];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Pressable style={[common.btn, { alignSelf: 'flex-start', flexDirection: 'row', gap: 6 }]} onPress={() => go('map')}>
        <Text style={common.btnText}>← {tr('backToMap')}</Text>
      </Pressable>

      <View style={{ height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        {isRemote(shown) ? (
          <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={altOf(shown)} />
        ) : (
          <Text style={{ color: '#fff', fontSize: 72, fontWeight: '800' }}>{poi.number}</Text>
        )}
        <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: colors.brand2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{tr('point')} {poi.number}</Text>
        </View>
      </View>

      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel={tr('gallery')}>
          {images.map((src, i) => (
            <Pressable
              key={src + i}
              onPress={() => setImgIdx(i)}
              accessibilityLabel={altOf(src)}
              style={{ width: 72, height: 54, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: i === imgIdx ? colors.gold : 'transparent' }}
            >
              <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={player.toggle}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand2, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={player.playing ? tr('pause') : tr('play')}
          >
            <Text style={{ color: '#fff', fontSize: 22 }}>{player.playing ? '❚❚' : '▶'}</Text>
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            {/* chạm vào thanh tiến độ để nhảy tới đoạn khác (UC3 A2) */}
            <Pressable
              style={{ height: 24, justifyContent: 'center' }}
              onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
              onPress={(e) => barW > 0 && player.seek(e.nativeEvent.locationX / barW)}
              accessibilityLabel={tr('narrationLabel')}
            >
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 2 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: '#fff', width: `${pct}%` }} />
              </View>
            </Pressable>
            <Text style={[common.muted, { fontSize: 12 }]}>{mmss(player.position)} / {mmss(player.total)} · {tr('narrationLabel')}</Text>
          </View>
        </View>
      </View>

      <Text style={common.title}>{r.content?.name}</Text>
      <Text style={common.subtitle}>{r.content?.description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Text style={chip}>{typeLabel}</Text>
        {poi.wheelchair && <Text style={chip}>{tr('wheelchair')}</Text>}
        {heard.has(poiId) && <Text style={[chip, { color: '#7be0ab' }]}>✓ {tr('heard')}</Text>}
      </View>
      {r.usedFallback && <Text style={common.notice}>{tr('fallback')}</Text>}
      {!player.supported && <Text style={common.notice}>{tr('noTts')}</Text>}
      {player.supported && !player.hasVoice && <Text style={common.notice}>{tr('noVoice')}</Text>}

      {paragraphs.map((p, i) => (
        <Text
          key={i}
          style={{ fontSize: 16, lineHeight: 26, paddingVertical: 4, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: player.playing && i === player.active ? colors.gold : 'transparent', color: colors.fg }}
        >
          {p}
        </Text>
      ))}

      {next && (
        <Pressable style={[common.btn, { alignSelf: 'flex-end' }]} onPress={() => go('poi', next.id)}>
          <Text style={common.btnText}>{tr('nextPoint')} →</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const chip = { color: colors.fg, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' as const };
