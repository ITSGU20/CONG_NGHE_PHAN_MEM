/**
 * Bộ tạo mã QR tối giản, không phụ thuộc thư viện (UC8, A3: mã QR chỉ chứa đường dẫn có mã điểm, BR-08).
 * Chế độ byte (UTF-8), mức sửa lỗi M, phiên bản 1–10 (tối đa 213 byte) – dư cho một đường dẫn.
 */

// [số byte sửa lỗi mỗi khối, nhóm 1: số khối, số byte dữ liệu, nhóm 2: số khối, số byte dữ liệu] cho mức M, phiên bản 1..10
const EC_M: Record<number, [number, number, number, number, number]> = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};
const FORMAT_M = 0; // bit mức sửa lỗi M

const bit = (v: number, i: number) => ((v >>> i) & 1) === 1;

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < degree) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 2);
  }
  return r;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    divisor.forEach((c, i) => (r[i] ^= gfMul(c, f)));
  }
  return r;
}

function dataCapacity(ver: number): number {
  const [, n1, d1, n2, d2] = EC_M[ver];
  return n1 * d1 + n2 * d2;
}

function buildCodewords(bytes: number[], ver: number): number[] {
  const bits: number[] = [];
  const push = (v: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const cap = dataCapacity(ver) * 8;
  push(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dataCapacity(ver); pad ^= 0xec ^ 0x11) data.push(pad);

  const [ecLen, n1, d1, n2, d2] = EC_M[ver];
  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < n1 + n2; i++) {
    const len = i < n1 ? d1 : d2;
    blocks.push(data.slice(k, k + len));
    k += len;
  }
  const div = rsDivisor(ecLen);
  const ecs = blocks.map((b) => rsRemainder(b, div));
  const out: number[] = [];
  const maxLen = Math.max(d1, d2);
  for (let i = 0; i < maxLen; i++) blocks.forEach((b) => i < b.length && out.push(b[i]));
  for (let i = 0; i < ecLen; i++) ecs.forEach((e) => out.push(e[i]));
  return out;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    lines.push(m[i].map((c) => (c ? '1' : '0')).join(''));
    lines.push(m.map((row) => (row[i] ? '1' : '0')).join(''));
  }
  for (const s of lines) {
    // N1: chuỗi ≥ 5 ô cùng màu; N3: mẫu giống ô định vị
    const runs = s.match(/0{5,}|1{5,}/g) ?? [];
    runs.forEach((r) => (score += 3 + r.length - 5));
    score += 40 * ((s.match(/(?=10111010000)/g) ?? []).length + (s.match(/(?=00001011101)/g) ?? []).length);
  }
  // N2: khối 2x2 cùng màu
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
  }
  // N4: tỷ lệ ô đen lệch khỏi 50%
  const dark = m.reduce((a, row) => a + row.filter(Boolean).length, 0);
  score += 10 * Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5);
  return score;
}

/** Trả về ma trận ô (true = ô đen). Ném lỗi nếu nội dung dài quá 213 byte. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1;
  while (ver <= 10 && 4 + (ver < 10 ? 8 : 16) + 8 * bytes.length > dataCapacity(ver) * 8) ver++;
  if (ver > 10) throw new Error('Nội dung mã QR quá dài');

  const size = ver * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFn = (x: number, y: number, v: boolean) => {
    mod[y][x] = v;
    fn[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const pos = ALIGN[ver];
  pos.forEach((px, i) =>
    pos.forEach((py, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );

  const drawFormat = (mask: number) => {
    const data = (FORMAT_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
    setFn(8, 7, bit(bits, 6));
    setFn(8, 8, bit(bits, 7));
    setFn(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0); // giữ chỗ: đánh dấu vùng định dạng là ô chức năng trước khi đặt dữ liệu
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, bit(bits, i));
      setFn(b, a, bit(bits, i));
    }
  }

  const cw = buildCodewords(bytes, ver);
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fn[y][x] && k < cw.length * 8) {
          mod[y][x] = bit(cw[k >>> 3], 7 - (k & 7));
          k++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[mask](x, y)) mod[y][x] = !mod[y][x];
  };
  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const sc = penalty(mod);
    if (sc < bestScore) {
      bestScore = sc;
      best = mask;
    }
    applyMask(mask); // hoàn tác
  }
  applyMask(best);
  drawFormat(best);
  return mod;
}

/** Chuỗi SVG của mã QR (có viền trắng 4 ô theo chuẩn) để hiển thị, in hoặc tải xuống */
export function qrSvg(text: string, px = 256): string {
  const m = qrMatrix(text);
  const n = m.length + 8;
  let d = '';
  m.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
