import { floorOf, type FloorId, type Poi } from '@ddl/shared';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { FLOOR_IMG } from '../floorMaps';
import { colors } from '../theme';

interface Props {
  floor: FloorId;
  pois: Poi[];
  heard: Set<string>;
  onPick: (p: Poi) => void;
}

/**
 * Bản đồ tĩnh theo tầng: số đặt theo % (mapX, mapY) trên ảnh của tầng đó.
 * Bản đồ rộng 800px (giữ tỷ lệ 1000:555) và vuốt ngang được, để các nút 44px (UI-01) không chồng lên nhau.
 */
export default function MapView({ floor, pois, heard, onPick }: Props) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.scroll} showsHorizontalScrollIndicator>
      <ImageBackground source={FLOOR_IMG[floor]} style={styles.map} imageStyle={styles.img} resizeMode="stretch">
        {pois.filter((p) => floorOf(p) === floor).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onPick(p)}
            style={[styles.pin, { left: `${p.mapX}%`, top: `${p.mapY}%`, backgroundColor: heard.has(p.id) ? colors.ok : colors.brand }]}
            accessibilityLabel={`${p.number}`}
          >
            <Text style={styles.pinText}>{p.number}</Text>
          </Pressable>
        ))}
      </ImageBackground>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, alignItems: 'center' },
  map: { width: 800, aspectRatio: 1000 / 555, borderRadius: 12, borderWidth: 2, borderColor: colors.line, overflow: 'hidden' },
  img: { borderRadius: 10 },
  // dịch tâm nút về đúng toạ độ: trừ nửa kích thước 44px
  pin: { position: 'absolute', width: 44, height: 44, marginLeft: -22, marginTop: -22, borderRadius: 22, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});