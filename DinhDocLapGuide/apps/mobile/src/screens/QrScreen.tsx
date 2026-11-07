import { track } from '@ddl/shared';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useApp } from '../context';
import { colors, common } from '../theme';

/** Đọc nội dung mã: đường dẫn /poi/<mã điểm> (BR-08) hoặc số in dưới mã QR */
function parseCode(raw: string): { id?: string; num?: number } {
  const v = raw.trim();
  const m = v.match(/\/poi\/([^/?#\s]+)/);
  if (m) return { id: decodeURIComponent(m[1]) };
  if (/^\d+$/.test(v)) return { num: Number(v) };
  return {};
}

/**
 * UC5 – Mở điểm bằng mã QR.
 * Bản khung: nhập số in dưới mã QR hoặc dán đường dẫn của mã (luồng thay thế A1). Quét camera thật cần thêm `expo-camera`
 * (CameraView + onBarcodeScanned): đưa chuỗi quét được vào parseCode() rồi mở điểm giống hàm open() bên dưới.
 */
export default function QrScreen() {
  const { pois, loaded, go, tr } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const open = () => {
    const { id, num } = parseCode(code);
    if (id === undefined && num === undefined) return setError(tr('invalidCode')); // E1: mã không thuộc hệ thống
    const poi = pois.find((p) => (id !== undefined ? p.id === id : p.number === num));
    if (!poi) return setError(tr('notFound')); // E1/E2: mã sai hoặc điểm chưa có nội dung
    track('poi_open', { poiId: poi.id, how: 'qr' });
    go('poi', poi.id);
  };

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Pressable style={[common.btn, { alignSelf: 'flex-start' }]} onPress={() => go('map')}>
        <Text style={common.btnText}>← {tr('backToMap')}</Text>
      </Pressable>
      <Text style={common.title}>{tr('scanQr')}</Text>
      <Text style={common.muted}>{tr('enterCode')}</Text>
      <TextInput
        value={code}
        onChangeText={(v) => { setCode(v); setError(''); }}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.card, color: colors.fg }}
      />
      {!!error && <Text style={{ color: colors.brand }}>{error}</Text>}
      <Pressable style={[common.btn, common.btnPrimary]} onPress={open} disabled={!loaded}>
        <Text style={common.btnTextPrimary}>{loaded ? tr('open') : tr('loading')}</Text>
      </Pressable>
      <Pressable style={common.btn} onPress={() => go('map')}>
        <Text style={common.btnText}>{tr('list')}</Text>
      </Pressable>
    </View>
  );
}
