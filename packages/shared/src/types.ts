export type LangCode = 'vi' | 'en' | 'zh' | 'ja' | 'ko' | 'fr';

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
];

export type PoiType = 'outdoor' | 'indoor' | 'mixed';

/** Nội dung của một điểm theo một ngôn ngữ. Âm thanh = giọng đọc (TTS) đọc `narration`. */
export interface PoiLangContent {
  name: string; // tối đa 80 ký tự
  description: string; // tối đa 300 ký tự
  narration: string; // văn bản thuyết minh, các đoạn cách nhau bằng dòng trống
  /** Chú thích ảnh (tối đa 120 ký tự, tuỳ chọn), khoá là URL của ảnh để không lệch khi sắp xếp lại ảnh (mục 8.4) */
  captions?: Record<string, string>;
}

/** Các trường chung của điểm (mục 8.4). Cũng nằm trên bản nháp để sửa không ảnh hưởng du khách cho đến khi xuất bản (BR-11). */
export interface PoiMeta {
  number: number;
  internalName: string;
  type: PoiType;
  wheelchair: boolean;
  mapX: number;
  mapY: number;
}

/** Một phiên bản nội dung: dùng cho cả "đang xuất bản" và "bản nháp" (BR-11) */
export interface PoiVersion {
  images: string[]; // ảnh đầu tiên là ảnh bìa (đường dẫn URL)
  content: Partial<Record<LangCode, PoiLangContent>>;
  /** Chỉ có ở bản nháp: các trường chung đang sửa */
  meta?: PoiMeta;
  /** Dấu thời gian lần lưu cuối, dùng để phát hiện hai người cùng sửa (UC8, E4) */
  updatedAt?: string | null;
}

export interface Poi {
  id: string;
  number: number; // số trên bản đồ, duy nhất
  internalName: string;
  type: PoiType;
  mapX: number; // vị trí theo % trên ảnh bản đồ (0-100)
  mapY: number;
  wheelchair?: boolean; // có lối đi xe lăn
  hidden: boolean; // ẩn/hiện có hiệu lực trực tiếp, không qua nháp
  published?: PoiVersion; // chưa xuất bản lần nào thì undefined
  draft?: PoiVersion; // mỗi điểm chỉ có một bản nháp
}

export type Role = 'admin' | 'editor' | 'viewer'; // BR-09

export interface AuditEntry {
  id: string;
  at: string; // ISO
  user: string;
  poiId: string;
  lang?: LangCode;
  action: string;
}

/** 9 sự kiện ở mục 10.2 */
export type EventName =
  | 'session_start'
  | 'heartbeat'
  | 'language_select'
  | 'audio_play'
  | 'audio_pause'
  | 'audio_stop'
  | 'listen_valid'
  | 'poi_open'
  | 'session_end';

export interface Stats {
  totalUsers: number;
  online: number; // đang truy cập
  playing: number; // đang sử dụng
  byLanguage: Record<LangCode, number>;
  byDay: { date: string; count: number }[];
}

/** Bộ lọc dashboard (UC7 bước 6). Ngày dạng YYYY-MM-DD, múi giờ Việt Nam. Bỏ trống = 7 ngày gần nhất, mọi ngôn ngữ. */
export interface StatsFilter {
  from?: string;
  to?: string;
  lang?: LangCode;
}

export type LoginResult =
  | { ok: true; user: { username: string; role: Role } }
  | { ok: false; reason: 'invalid' | 'locked'; minutesLeft?: number };
