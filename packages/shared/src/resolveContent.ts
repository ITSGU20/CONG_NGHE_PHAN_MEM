import type { LangCode, PoiLangContent, PoiVersion } from './types';

export interface ResolvedContent {
  content?: PoiLangContent;
  /** ngôn ngữ của văn bản thực tế hiển thị (cũng là ngôn ngữ giọng đọc) */
  textLang?: LangCode;
  /** ngôn ngữ âm thanh thực tế được đọc; undefined = không có nội dung để đọc */
  audioLang?: LangCode;
  usedFallback: boolean;
}

/**
 * BR-07: thiếu bản dịch của ngôn ngữ đã chọn thì dùng tiếng Anh.
 * Âm thanh là giọng đọc nội dung thuyết minh nên audioLang = ngôn ngữ của văn bản đang hiển thị.
 */
export function resolveContent(version: PoiVersion | undefined, lang: LangCode): ResolvedContent {
  const picked = version?.content[lang];
  const en = version?.content.en;
  const usePicked = !!picked?.name;
  const content = usePicked ? picked : en;
  const textLang: LangCode | undefined = usePicked ? lang : en ? 'en' : undefined;
  const audioLang = content?.narration?.trim() ? textLang : undefined;
  return { content, textLang, audioLang, usedFallback: textLang !== undefined && textLang !== lang };
}
