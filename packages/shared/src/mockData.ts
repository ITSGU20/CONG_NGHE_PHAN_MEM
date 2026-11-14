import type { Poi, PoiType, PoiVersion } from './types';

// NỘI DUNG MẪU để chạy thử giao diện. Nội dung lịch sử thật phải do Ban quản lý duyệt (mục 13 PRD).
const sample = (vi: string, en: string, fr?: string): PoiVersion['content'] => ({
  vi: {
    name: vi,
    description: `Giới thiệu về ${vi} tại Dinh Độc Lập.`,
    narration: `Chào mừng quý khách đến với ${vi}. Đây là một trong những không gian lịch sử tiêu biểu nằm trong sơ đồ tham quan chính thức của Dinh Độc Lập.\n\nNội dung thuyết minh chi tiết giới thiệu về kiến trúc, công năng và các dấu mốc lịch sử gắn liền với ${vi}.\n\nQuý khách có thể đối chiếu vị trí trên bản đồ từng tầng để tiếp tục hành trình tham quan.`,
  },
  en: {
    name: en,
    description: `Introduction to the ${en} at Independence Palace.`,
    narration: `Welcome to the ${en}. This is one of the historical spaces featured on the official floor plan of the Independence Palace.\n\nThis narration introduces the architecture, function, and historical milestones associated with the ${en}.\n\nPlease refer to the interactive floor map to continue your tour.`,
  },
  ...(fr
    ? {
        fr: {
          name: fr,
          description: `Présentation de : ${fr}.`,
          narration: `Bienvenue à : ${fr}. Cet espace fait partie du parcours officiel du Palais de la Réunification.`,
        },
      }
    : {}),
});

// [số, id, tên vi, tên en, tên fr, loại, x%, y%, tầng, lối xe lăn] – khớp với 6 ảnh sơ đồ thực tế + 2 điểm sân ngoài trời
const rows: [number, string, string, string, string, PoiType, number, number, number, boolean][] = [
  // Tầng 1 (1st Floor) - Điểm 1..4
  [1,  'poi-1',  'Phòng Nội các',                      'Cabinet room',                      'Salle du Conseil des ministres',    'indoor',  63.5, 52.0,  1, true],
  [2,  'poi-2',  'Phòng Đại yến',                      'State banqueting hall',             'Salle des banquets',                'indoor',  36.5, 52.0,  1, true],
  [3,  'poi-3',  'Cầu thang trung tâm',                'Central staircase',                 'Escalier central',                  'indoor',  50.0, 47.3,  1, false],
  [4,  'poi-4',  'Phòng Khánh tiết',                   'Conference hall',                   'Salle de cérémonie',                'indoor',  50.0, 28.4,  1, true],

  // Tầng 2 (2nd Floor) - Điểm 5..10
  [5,  'poi-5',  'Phòng Hội đồng an ninh Quốc gia',    'National security council chamber', 'Salle du Conseil de sécurité nationale', 'indoor', 25.0, 50.5, 2, false],
  [6,  'poi-6',  'Phòng làm việc của Tổng thống',      'Presidential office',               'Bureau du Président',               'indoor',  25.3, 57.7,  2, false],
  [7,  'poi-7',  'Phòng khách của Tổng thống',         'Presidential reception rooms',      'Salons de réception du Président',  'indoor',  38.8, 50.5,  2, false],
  [8,  'poi-8',  'Phòng khách của Phó Tổng thống',     "Vice-president's reception salon",  'Salon de réception du Vice-président', 'indoor', 65.0, 50.5, 2, false],
  [9,  'poi-9',  'Phòng trình quốc thư',               'Ambassadors chamber',               'Salon des Ambassadeurs',            'indoor',  50.0, 29.5,  2, false],
  [10, 'poi-10', 'Khu gia đình Tổng thống',            'Private appartments',               'Appartements privés',               'indoor',  50.0,  9.0,  2, false],

  // Tầng 3 (3rd Floor) - Điểm 11..14
  [11, 'poi-11', 'Thư viện',                           'Library',                           'Bibliothèque',                      'indoor',  24.9, 57.7,  3, false],
  [12, 'poi-12', 'Phòng khách phu nhân Tổng thống',    "First lady's reception room",       'Salon de réception de la Première dame', 'indoor', 37.8, 50.5, 3, false],
  [13, 'poi-13', 'Phòng chiếu phim',                   'Cinema',                            'Cinéma',                            'indoor',  50.8, 50.5,  3, false],
  [14, 'poi-14', 'Phòng giải trí',                     'Game room',                         'Salle de jeu',                      'indoor',  68.3, 50.5,  3, false],

  // Tầng 4 / Sân thượng (4th Floor / Rooftop) - Điểm 15..16
  [15, 'poi-15', 'Tứ phương vô sự lâu',                'Salon of the 4 cardinal directions','Salle des quatre directions',       'mixed',   50.0, 51.8,  4, false],
  [16, 'poi-16', 'Trực thăng UH1',                     'Helicopter UH-1',                   'Hélicoptère UH-1',                  'outdoor', 50.0, 19.4,  4, false],

  // Tầng hầm (Bunker / Basement) - Điểm 17..20
  [17, 'poi-17', 'Tham mưu tác chiến',                 'Command centre',                    'Commandement',                      'indoor',  77.5, 38.3, -1, false],
  [18, 'poi-18', 'Thông tin liên lạc',                 'Communications',                    'Transmissions',                     'indoor',  63.8, 44.6, -1, false],
  [19, 'poi-19', 'Phòng ngủ Tổng thống',               "President's bedroom",               'Chambre du Président',              'indoor',  50.4, 45.5, -1, false],
  [20, 'poi-20', 'Phòng trực chiến của Tổng thống',    "President's war room",              'Salle de guerre du Président',      'indoor',  46.4, 45.5, -1, false],

  // Tầng trệt & Sân ngoài trời (Ground Floor & Outdoor Yard) - Điểm 21..27
  [21, 'poi-21', 'Bếp',                                'Kitchen',                           'Cuisine',                           'indoor',  24.5, 49.1,  0, true],
  [22, 'poi-22', 'Xe Jeep',                            'Jeep',                              'Jeep',                              'indoor',  31.8, 52.7,  0, true],
  [23, 'poi-23', 'Xe Mercedes',                        'Mercedes',                          'Mercedes',                          'indoor',  64.5, 46.8,  0, true],
  [24, 'poi-24', 'Phim tư liệu',                       'Documentary films',                 'Films documentaires',               'indoor',  43.8, 35.0,  0, true],
  [25, 'poi-25', 'Phòng tập bắn',                      'Shooting gallery',                  'Salle de tir',                      'indoor',  52.8, 27.3,  0, true],
  [26, 'poi-26', 'Cổng chính và sân vườn',             'Main gate and garden',              'Portail principal et jardin',       'outdoor', 50.0, 93.0,  0, true],
  [27, 'poi-27', 'Xe tăng trong sân trước',            'Tanks in the front yard',           'Chars dans la cour avant',          'outdoor', 31.0, 82.0,  0, true],
];

export const seedPois = (): Poi[] =>
  rows.map(([number, id, vi, en, fr, type, mapX, mapY, floor, wheelchair]) => {
    const content = sample(vi, en, fr);
    if (number === 1 || number === 26) {
      content.ja = {
        name: number === 26 ? '正門と庭園' : '内閣会議室',
        description: `${vi}の紹介。`,
        narration: `ここは${vi}です。\n\nサンプルの解説文です。`,
      };
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
      published: { images: number === 26 || number === 1 ? ['/img/poi-1.jpg'] : [`placeholder-${number}`], content },
    };
  });

export const demoAccounts = [
  { username: 'admin', password: 'admin123', role: 'admin' as const },
  { username: 'editor', password: 'editor123', role: 'editor' as const },
  { username: 'viewer', password: 'viewer123', role: 'viewer' as const },
];
