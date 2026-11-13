import type { LangCode, Poi } from './types';

/** Số tầng: -1 = hầm, 0 = trệt, 1..3 = tầng 1..3, 4 = sân thượng. Muốn thêm tầng: thêm một dòng ở đây + một ảnh + một dòng trong floorMaps của mỗi app. */
export type FloorId = number;

export const FLOORS: { id: FloorId; names: Record<LangCode, string> }[] = [
  { id: 4, names: { vi: 'Sân thượng', en: 'Rooftop', zh: '屋顶', ja: '屋上', ko: '옥상', fr: 'Toit-terrasse' } },
  { id: 3, names: { vi: 'Tầng 3', en: 'Floor 3', zh: '第3层', ja: '3フロア', ko: '3층', fr: 'Étage 3' } },
  { id: 2, names: { vi: 'Tầng 2', en: 'Floor 2', zh: '第2层', ja: '2フロア', ko: '2층', fr: 'Étage 2' } },
  { id: 1, names: { vi: 'Tầng 1', en: 'Floor 1', zh: '第1层', ja: '1フロア', ko: '1층', fr: 'Étage 1' } },
  { id: 0, names: { vi: 'Tầng trệt', en: 'Ground floor', zh: '底层', ja: 'グランドフロア', ko: '지상층', fr: 'Rez-de-chaussée' } },
  { id: -1, names: { vi: 'Tầng hầm', en: 'Basement', zh: '地下室', ja: '地下', ko: '지하', fr: 'Sous-sol' } },
];

export const DEFAULT_FLOOR: FloorId = 0;

export const floorName = (id: FloorId, lang: LangCode) => FLOORS.find((f) => f.id === id)?.names[lang] ?? String(id);

/** Dữ liệu cũ (localStorage/DB chưa có cột tầng) được coi là tầng trệt */
export const floorOf = (p: Pick<Poi, 'floor'>): FloorId => p.floor ?? DEFAULT_FLOOR;
