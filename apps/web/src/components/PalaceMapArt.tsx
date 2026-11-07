/**
 * Bản đồ minh hoạ vẽ bằng SVG (khung 1000x555) theo phong cách mặt bằng nhìn nghiêng.
 * Khi Ban quản lý có sơ đồ thật: thay toàn bộ <svg> này bằng <img src="/maps/so-do.png" className="mapart" />
 * (giữ tỷ lệ 1000:555, hoặc đổi aspect-ratio của .map trong styles.css).
 */
const trees: [number, number, number][] = [
  [150, 330, 13], [180, 305, 11], [215, 360, 12], [250, 385, 14], [285, 410, 12], [330, 440, 13], [365, 470, 11],
  [600, 470, 12], [640, 450, 13], [680, 425, 11], [720, 400, 12], [760, 370, 13], [330, 190, 11], [300, 215, 12],
  [425, 150, 12], [450, 125, 10], [610, 120, 12], [690, 110, 11], [905, 330, 12], [870, 360, 10], [250, 290, 12], [215, 262, 10],
  [430, 520, 11], [560, 510, 10],
];

function Box({ x, y, w, h, dx, dy, tone = 0 }: { x: number; y: number; w: number; h: number; dx: number; dy: number; tone?: number }) {
  const top = ['#33405e', '#2c3a58'][tone];
  const front = ['#1c2540', '#18213a'][tone];
  const side = ['#121a30', '#0f1628'][tone];
  return (
    <g stroke="#8a98ba" strokeOpacity=".55" strokeWidth="1">
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + dx},${y - dy} ${x + dx},${y - dy}`} fill={top} />
      <rect x={x} y={y} width={w} height={h} fill={front} />
      <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y - dy + h} ${x + w},${y + h}`} fill={side} />
    </g>
  );
}

export default function PalaceMapArt() {
  return (
    <svg className="mapart" viewBox="0 0 1000 555" preserveAspectRatio="none" aria-hidden>

      {/* mặt đất và đường */}
      <polygon points="40,330 470,70 970,250 560,548" fill="#22472b" stroke="#3b7a47" strokeWidth="2" />
      <ellipse cx="500" cy="345" rx="255" ry="128" fill="#2f6a39" stroke="#19223a" strokeWidth="30" />
      <ellipse cx="500" cy="345" rx="255" ry="128" fill="none" stroke="#3a4a68" strokeWidth="1" strokeDasharray="6 8" />
      <path d="M490 548V470" stroke="#19223a" strokeWidth="34" />
      <path d="M690 285 Q620 230 560 230 T440 200" fill="none" stroke="#19223a" strokeWidth="22" />
      <path d="M440 200 Q400 150 380 110" fill="none" stroke="#19223a" strokeWidth="18" />

      {/* công trình phụ */}
      <Box x={180} y={250} w={80} h={38} dx={34} dy={22} tone={1} />
      <Box x={300} y={150} w={90} h={34} dx={34} dy={22} tone={1} />
      <Box x={470} y={120} w={70} h={30} dx={28} dy={18} tone={1} />
      <Box x={575} y={78} w={70} h={30} dx={28} dy={18} tone={1} />
      <Box x={810} y={335} w={70} h={32} dx={28} dy={20} tone={1} />
      <Box x={800} y={140} w={70} h={30} dx={28} dy={18} tone={1} />
      <Box x={640} y={440} w={60} h={28} dx={24} dy={16} tone={1} />

      {/* toà nhà chính */}
      <Box x={625} y={205} w={200} h={78} dx={64} dy={50} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={635 + i * 20} y1={212} x2={635 + i * 20} y2={277} stroke="#8a98ba" strokeOpacity=".35" />
      ))}
      <line x1="625" y1="242" x2="825" y2="242" stroke="#8a98ba" strokeOpacity=".35" />
      <rect x="716" y="150" width="3" height="40" fill="#8a98ba" />
      <rect x="719" y="150" width="16" height="10" fill="#d9a441" />

      {/* cây */}
      {trees.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#1d4a2a" stroke="#38804a" strokeWidth="1.2" />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.45} fill="#2a6a3b" />
        </g>
      ))}
    </svg>
  );
}
