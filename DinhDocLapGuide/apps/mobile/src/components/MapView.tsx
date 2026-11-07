import type { Poi } from '@ddl/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  pois: Poi[];
  heard: Set<string>;
  onPick: (p: Poi) => void;
}

/** Bản đồ tĩnh: số đặt theo % (mapX, mapY). Khi có ảnh sơ đồ thật, thay View nền bằng <ImageBackground>. */
export default function MapView({ pois, heard, onPick }: Props) {
  return (
    <View style={styles.map}>
      {pois.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onPick(p)}
          style={[styles.pin, { left: `${p.mapX}%`, top: `${p.mapY}%`, backgroundColor: heard.has(p.id) ? colors.ok : colors.brand }]}
          accessibilityLabel={`${p.number}`}
        >
          <Text style={styles.pinText}>{p.number}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, margin: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card },
  // dịch tâm nút về đúng toạ độ: trừ nửa kích thước 44px
  pin: { position: 'absolute', width: 44, height: 44, marginLeft: -22, marginTop: -22, borderRadius: 22, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
