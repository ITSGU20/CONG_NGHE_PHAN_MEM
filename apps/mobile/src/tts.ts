import type { TtsEngine } from '@ddl/shared';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

// Danh sách giọng của hệ điều hành được nạp bất đồng bộ; null = chưa biết (khi đó coi như có giọng để không báo nhầm)
let voiceLangs: string[] | null = null;
const listeners = new Set<() => void>();
Speech.getAvailableVoicesAsync()
  .then((vs) => {
    voiceLangs = vs.map((v) => v.language.toLowerCase().replace('_', '-'));
    listeners.forEach((f) => f());
  })
  .catch(() => undefined);

/** Giúp giao diện cập nhật khi danh sách giọng đã sẵn sàng */
export function useVoicesReady() {
  const [, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((x) => x + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
}

/** Giọng đọc của hệ điều hành (iOS/Android) qua expo-speech */
export const nativeTts: TtsEngine = {
  supported: true,
  hasVoice: (locale) => {
    if (voiceLangs === null) return true;
    const lc = locale.toLowerCase();
    return voiceLangs.some((l) => l === lc || l.startsWith(lc.slice(0, 2)));
  },
  speak(text, locale, onEnd) {
    Speech.speak(text, { language: locale, onDone: onEnd, onError: onEnd });
  },
  cancel() {
    void Speech.stop();
  },
};
