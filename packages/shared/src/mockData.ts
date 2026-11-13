import type { Poi, PoiType, PoiVersion } from './types';

// NỘI DUNG MẪU để chạy thử giao diện. Nội dung lịch sử thật phải do Ban quản lý duyệt (mục 13 PRD).
const sample = (vi: string, en: string): PoiVersion['content'] => ({
  vi: {
    name: vi,
    description: `Giới thiệu ngắn về ${vi}.`,
    narration: `Đây là ${vi}. Đây là nội dung thuyết minh mẫu.\n\nNội dung thuyết minh mẫu sẽ được Ban quản lý thay bằng nội dung chính thức.\n\nĐây là đoạn thứ ba của bài thuyết minh mẫu.`,
  },
  en: {
    name: en,
    description: `A short introduction to ${en}.`,
    narration: `This is the ${en}. This is sample narration text.\n\nThe sample narration will be replaced by official content.\n\nThis is the third paragraph of the sample narration.`,
  },
});

// [số, id, tên vi, tên en, loại, x%, y%, tầng, lối xe lăn]  – vị trí khớp với bản đồ minh hoạ
const rows: [number, string, string, string, PoiType, number, number, number, boolean][] = [
  [1, 'poi-1', 'Cổng chính và sân vườn', 'Main gate and garden', 'outdoor', 50, 93, 0, true],
[2, 'poi-2', 'Xe tăng trong sân trước', 'Tanks in the front yard', 'outdoor', 31, 77, 0, true],
[3, 'poi-3', 'Phòng Khánh tiết', 'Reception Hall', 'indoor', 50, 59, 1, true],
[4, 'poi-4', 'Phòng làm việc của Tổng thống', "President's Office", 'indoor', 77, 35, 2, false],
[5, 'poi-5', 'Phòng Đại yến', 'Banquet Hall', 'indoor', 23, 35, 1, true],
[6, 'poi-6', 'Phòng Ngoại giao đoàn', 'Diplomatic Corps Room', 'indoor', 23, 35, 2, false],
[7, 'poi-7', 'Tầng thượng và sân đỗ trực thăng', 'Rooftop and helipad', 'mixed', 50, 38, 4, false],
[8, 'poi-8', 'Tầng hầm và hầm chỉ huy', 'Basement and command bunker', 'indoor', 29, 28, -1, false],
];

export const seedPois = (): Poi[] =>
  rows.map(([number, id, vi, en, type, mapX, mapY, floor, wheelchair ]) => {
    const content = sample(vi, en);
    // Điểm 1 có thêm tiếng Nhật để thử; các ngôn ngữ khác thiếu => dùng tiếng Anh (BR-07)
    if (number === 1) {
      content.ja = { name: '正門と庭園', description: '正門と庭園の紹介。', narration: 'ここは正門です。\n\nサンプルの解説文です。' };
    }
    return {
      id,
      number,
      internalName: en,
      type,
      mapX,
      mapY,
      floor,
      wheelchair,
      hidden: false,
      published: { images: number === 1 ? ['/img/poi-1.jpg'] : [`placeholder-${number}`], content },
    };
  });

export const demoAccounts = [
  { username: 'admin', password: 'admin123', role: 'admin' as const },
  { username: 'editor', password: 'editor123', role: 'editor' as const },
  { username: 'viewer', password: 'viewer123', role: 'viewer' as const },
];
