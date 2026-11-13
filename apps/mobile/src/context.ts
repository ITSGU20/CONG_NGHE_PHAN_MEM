import type { LangCode, Poi, t } from '@ddl/shared';
import { createContext, useContext } from 'react';

export interface AppCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  pois: Poi[];
  /** đã tải xong danh sách điểm (thành công hoặc lỗi) */
  loaded: boolean;
  /** UC3 E2: lỗi tải nội dung hoặc mạng yếu */
  loadError: boolean;
  reload: () => void;
  heard: Set<string>;
  markHeard: (id: string) => void;
  tr: (k: Parameters<typeof t>[1]) => string;
  go: (name: 'language' | 'map' | 'poi', id?: string) => void;
}

export const AppContext = createContext<AppCtx>(null as never);
export const useApp = () => useContext(AppContext);
