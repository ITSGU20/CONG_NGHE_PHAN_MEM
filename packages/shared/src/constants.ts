import type { LangCode } from './types';

export const LISTEN_VALID_SECONDS = 10; // BR-03
export const HEARTBEAT_MS = 30_000; // mục 10.2
export const DASHBOARD_POLL_MS = 5_000; // NFR-04
export const ONLINE_WINDOW_S = 90; // mục 10.1
export const MAX_IMAGES_PER_POI = 10; // BR-10
export const MAX_IMAGE_MB = 5;
export const MIN_IMAGE_EDGE = 800; // BR-10: cạnh dài tối thiểu (px)
export const CAPTION_MAX = 120; // mục 8.4
export const LOGIN_MAX_FAILS = 5; // UC6 E2 (đề xuất)
export const LOGIN_LOCK_MIN = 15; // UC6 E2 (đề xuất, phút)
export const LOCATION_PRECISION = 1; // số lẻ khi đặt vị trí điểm trên bản đồ (%)
export const NAME_MAX = 80;
export const DESC_MAX = 300;
export const DESKTOP_MIN_WIDTH = 1024; // UI-02, UI-03

/** Mã giọng đọc (BCP-47) cho từng ngôn ngữ */
export const TTS_LOCALE: Record<LangCode, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  fr: 'fr-FR',
};

/** Ước lượng tốc độ đọc (ký tự/giây) để hiển thị thanh tiến độ và thời lượng */
export const TTS_CHARS_PER_SEC = 14;
