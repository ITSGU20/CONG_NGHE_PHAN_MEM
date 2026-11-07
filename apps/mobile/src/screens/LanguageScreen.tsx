import { LANGUAGES } from '@ddl/shared';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../context';
import { common } from '../theme';

/** UC1 – Chọn ngôn ngữ */
export default function LanguageScreen() {
  const { setLang, go, tr } = useApp();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={[common.title, { textAlign: 'center', marginBottom: 12 }]}>{tr('chooseLang')}</Text>
      {LANGUAGES.map((l) => (
        <Pressable
          key={l.code}
          style={[common.btn, { minHeight: 56 }]}
          onPress={() => {
            setLang(l.code);
            go('map');
          }}
        >
          <Text style={common.btnText}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
