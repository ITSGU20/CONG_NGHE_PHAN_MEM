import { floorOf, type FloorId, type Poi } from '@ddl/shared';
import { useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FLOOR_IMG } from '../floorMaps';
import { colors } from '../theme';

interface Props {
  floor: FloorId;
  pois: Poi[];
  heard: Set<string>;
  onPick: (p: Poi) => void;
}

/**
 * Bản đồ hiển thị full màn hình theo chiều ngang thiết bị (như trên Web)
 * và hỗ trợ phóng to / thu nhỏ.
 */
export default function MapView({ floor, pois, heard, onPick }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);

  // Chiều rộng vừa khít màn hình (trừ 24px padding 2 bên), nhân với mức zoom
  const baseWidth = Math.max(screenWidth - 24, 300);
  const mapWidth = baseWidth * zoom;

  // Kích thước nút chấm điểm tự điều chỉnh theo mức zoom
  const pinSize = zoom > 1.3 ? 34 : 26;
  const halfPin = pinSize / 2;

  return (
    <View style={styles.wrapper}>
      {/* Thanh nút Phóng to / Thu nhỏ */}
      <View style={styles.zoomBar}>
        <Pressable
          style={styles.zoomBtn}
          onPress={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
        >
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Pressable style={styles.zoomReset} onPress={() => setZoom(1)}>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
        </Pressable>
        <Pressable
          style={styles.zoomBtn}
          onPress={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
        >
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.verticalScroll}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.horizontalScroll}
          showsHorizontalScrollIndicator={zoom > 1}
        >
          <ImageBackground
            source={FLOOR_IMG[floor]}
            style={[styles.map, { width: mapWidth }]}
            imageStyle={styles.img}
            resizeMode="stretch"
          >
            {pois
              .filter((p) => floorOf(p) === floor)
              .map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPick(p)}
                  style={[
                    styles.pin,
                    {
                      width: pinSize,
                      height: pinSize,
                      borderRadius: halfPin,
                      marginLeft: -halfPin,
                      marginTop: -halfPin,
                      left: `${p.mapX}%`,
                      top: `${p.mapY}%`,
                      backgroundColor: heard.has(p.id) ? colors.ok : colors.brand,
                    },
                  ]}
                  accessibilityLabel={`${p.number}`}
                >
                  <Text style={[styles.pinText, { fontSize: zoom > 1.3 ? 14 : 11 }]}>
                    {p.number}
                  </Text>
                </Pressable>
              ))}
          </ImageBackground>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  zoomBar: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  zoomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  zoomBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.fg,
  },
  zoomReset: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  zoomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.fg,
  },
  verticalScroll: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  horizontalScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  map: {
    aspectRatio: 1000 / 555,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  img: {
    borderRadius: 10,
  },
  pin: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    color: '#fff',
    fontWeight: '700',
  },
});