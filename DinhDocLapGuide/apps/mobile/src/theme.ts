import { StyleSheet } from 'react-native';

// Cùng bảng màu với web (tông tối)
export const colors = { bg: '#0c1120', brand: '#c4262e', brand2: '#e04a3a', ok: '#2fb36a', gold: '#e3a85c', fg: '#eaeef8', muted: '#98a2b8', card: '#1a2238', line: '#263049' };

/** Nút và số trên bản đồ tối thiểu 44px (UI-01) */
export const common = StyleSheet.create({
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  btnText: { fontSize: 16, color: colors.fg },
  btnTextPrimary: { color: '#fff', fontWeight: '600', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.fg },
  subtitle: { fontSize: 16, color: colors.gold },
  muted: { color: colors.muted },
  notice: { backgroundColor: '#3a2f12', color: '#f2d58a', padding: 8, borderRadius: 10, marginVertical: 6, overflow: 'hidden' },
});
