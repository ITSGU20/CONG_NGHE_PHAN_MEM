import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from './analytics';
import { TTS_CHARS_PER_SEC, TTS_LOCALE } from './constants';
import { ListenTracker } from './listenTracker';
import type { LangCode } from './types';

/** Giao diện bộ đọc giọng nói; web dùng speechSynthesis, mobile dùng expo-speech */
export interface TtsEngine {
  supported: boolean;
  hasVoice(locale: string): boolean;
  /** Đọc một đoạn; gọi onEnd khi đọc xong (KHÔNG gọi khi bị cancel) */
  speak(text: string, locale: string, onEnd: () => void): void;
  cancel(): void;
}

interface Options {
  poiId: string;
  /** Ngôn ngữ giọng đọc thực tế (BR-07: bằng tiếng Anh nếu thiếu bản dịch) */
  lang: LangCode;
  /** Ngôn ngữ du khách đã chọn; ghi kèm ở audio_play (mục 10.2) */
  selectedLang?: LangCode;
  paragraphs: string[];
  engine: TtsEngine;
  onListenValid?: () => void;
}

/**
 * Trình phát: "Phát" = đọc nội dung thuyết minh thành tiếng, từng đoạn một.
 * Đọc theo đoạn để tạm dừng/tiếp tục ổn định ở mọi nền tảng (tạm dừng = dừng, tiếp tục = đọc lại từ đầu đoạn đang đọc)
 * và để văn bản được làm nổi bật đúng đoạn đang đọc.
 */
export function usePlayer({ poiId, lang, selectedLang, paragraphs, engine, onListenValid }: Options) {
  const locale = TTS_LOCALE[lang];
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const [inPara, setInPara] = useState(0);
  const run = useRef(0); // đổi số này để vô hiệu các callback cũ
  const activeRef = useRef(0);
  const playingRef = useRef(false);
  const parasRef = useRef(paragraphs);
  parasRef.current = paragraphs;
  const validRef = useRef(onListenValid);
  validRef.current = onListenValid;

  const tracker = useRef(
    new ListenTracker((played) => {
      track('listen_valid', { poiId, audioLang: lang, played });
      validRef.current?.();
    }),
  );

  const durations = useMemo(() => paragraphs.map((p) => Math.max(2, p.length / TTS_CHARS_PER_SEC)), [paragraphs]);
  const total = durations.reduce((a, b) => a + b, 0);
  const before = durations.slice(0, active).reduce((a, b) => a + b, 0);
  const position = Math.min(total, before + Math.min(inPara, durations[active] ?? 0));

  const finish = useCallback(() => {
    run.current += 1;
    activeRef.current = 0;
    setActive(0);
    setInPara(0);
    setPlaying(false);
    playingRef.current = false;
    track('audio_stop', { poiId, played: tracker.current.played });
    tracker.current.reset(); // phát lại từ đầu là lần phát mới (mục 10.1)
  }, [poiId]);

  const speakFrom = useCallback(
    (i: number, myRun: number) => {
      const paras = parasRef.current;
      if (i >= paras.length) return finish();
      activeRef.current = i;
      setActive(i);
      setInPara(0);
      engine.speak(paras[i], locale, () => {
        if (run.current === myRun) speakFrom(i + 1, myRun);
      });
    },
    [engine, locale, finish],
  );

  // đếm giây phát thực tế để tính lượt nghe (BR-03)
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setInPara((x) => x + 1);
      tracker.current.tick(1);
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  // rời trang điểm thì dừng hẳn
  useEffect(
    () => () => {
      run.current += 1;
      engine.cancel();
      // đang phát hoặc đã nghe dở mà rời trang/đổi điểm/đổi ngôn ngữ => dừng hẳn (mục 10.2); không gửi thì "đang sử dụng" bị kẹt
      if (playingRef.current || tracker.current.played > 0) track('audio_stop', { poiId, played: tracker.current.played });
      playingRef.current = false;
    },
    [poiId, engine],
  );

  const toggle = () => {
    if (playing) {
      run.current += 1;
      engine.cancel();
      setPlaying(false);
      playingRef.current = false;
      track('audio_pause', { poiId, played: tracker.current.played });
      return;
    }
    if (!engine.supported || paragraphs.length === 0) return;
    run.current += 1;
    track('audio_play', { poiId, selectedLang: selectedLang ?? lang, audioLang: lang });
    setPlaying(true);
    playingRef.current = true;
    speakFrom(activeRef.current, run.current);
  };

  /** Nhảy tới vị trí (0..1) trên thanh tiến độ: chọn đoạn tương ứng */
  const seek = (ratio: number) => {
    const target = Math.min(1, Math.max(0, ratio)) * total;
    let acc = 0;
    let idx = 0;
    for (let i = 0; i < durations.length; i++) {
      idx = i;
      if (acc + durations[i] > target) break;
      acc += durations[i];
    }
    if (ratio <= 0.02) tracker.current.reset(); // kéo về đầu = lần phát mới (mục 10.1)
    activeRef.current = idx;
    setActive(idx);
    setInPara(0);
    if (playing) {
      run.current += 1;
      engine.cancel();
      speakFrom(idx, run.current);
    }
  };

  return {
    playing,
    active,
    position,
    total,
    toggle,
    seek,
    supported: engine.supported,
    hasVoice: engine.hasVoice(locale),
  };
}
