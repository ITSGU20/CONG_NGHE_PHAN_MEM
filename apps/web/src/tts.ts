import type { TtsEngine } from '@ddl/shared';
import { useEffect, useState } from 'react';

const synth: SpeechSynthesis | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let token = 0;
let current: SpeechSynthesisUtterance | null = null; // giữ tham chiếu để trình duyệt không thu hồi giữa chừng

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = synth?.getVoices() ?? [];
  const lc = locale.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().replace('_', '-') === lc) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lc.slice(0, 2)));
}

/** Giọng đọc có sẵn của trình duyệt (Web Speech API): miễn phí, không cần máy chủ */
export const webTts: TtsEngine = {
  supported: !!synth,
  hasVoice: (locale) => !!pickVoice(locale),
  speak(text, locale, onEnd) {
    if (!synth) return;
    const my = ++token;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    const voice = pickVoice(locale);
    if (voice) u.voice = voice;
    const done = () => {
      if (my === token) onEnd();
    };
    u.onend = done;
    u.onerror = done;
    current = u;
    synth.speak(u);
  },
  cancel() {
    token += 1; // vô hiệu callback của câu đang đọc
    current = null;
    synth?.cancel();
  },
};

/** Danh sách giọng được nạp bất đồng bộ; hook này giúp giao diện cập nhật khi giọng sẵn sàng */
export function useVoicesReady() {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!synth) return;
    const on = () => setN((x) => x + 1);
    synth.addEventListener('voiceschanged', on);
    return () => synth.removeEventListener('voiceschanged', on);
  }, []);
}
