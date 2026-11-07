import { getBackend, MAX_IMAGE_MB, MIN_IMAGE_EDGE } from '@ddl/shared';

type Mime = 'image/jpeg' | 'image/png' | 'image/webp';
const MAX_EDGE = 1600; // NFR-12: ảnh được tự thu nhỏ: cạnh dài tối đa (px)
const QUALITY = 0.85;

/** Đọc vài byte đầu để biết loại ảnh thật, không tin đuôi tên file (NFR-08) */
async function sniff(file: Blob): Promise<Mime | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q));

/**
 * Kiểm tra (BR-10, NFR-08), thu nhỏ và nén (NFR-12) rồi trả về tệp sẵn sàng tải lên.
 * Có thể ném lỗi với thông điệp tiếng Việt, nội dung đang nhập không bị ảnh hưởng (UC8, E1/E3).
 */
async function prepare(file: File): Promise<{ blob: Blob; mime: Mime }> {
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`"${file.name}": ảnh quá ${MAX_IMAGE_MB} MB`);
  const mime = await sniff(file);
  if (!mime) throw new Error(`"${file.name}": chỉ nhận ảnh JPG, PNG hoặc WebP (nội dung tệp không phải ảnh hợp lệ)`);

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error(`"${file.name}": tệp ảnh bị hỏng, không đọc được`);
  }
  const { width, height } = bmp;
  const long = Math.max(width, height);
  if (long < MIN_IMAGE_EDGE) {
    bmp.close();
    throw new Error(`"${file.name}": ảnh quá nhỏ (${width}×${height}), cạnh dài cần tối thiểu ${MIN_IMAGE_EDGE}px`);
  }

  // chỉ vẽ lại khi cần thu nhỏ; ảnh đã vừa cỡ thì giữ nguyên bản gốc, không nén thêm làm giảm chất lượng
  if (long <= MAX_EDGE) {
    bmp.close();
    return { blob: file, mime };
  }
  const k = MAX_EDGE / long;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * k);
  canvas.height = Math.round(height * k);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close();
    return { blob: file, mime };
  }
  const outMime: Mime = mime === 'image/webp' ? 'image/webp' : 'image/jpeg';
  if (outMime === 'image/jpeg') {
    ctx.fillStyle = '#fff'; // JPEG không có nền trong suốt
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const out = await toBlob(canvas, outMime, QUALITY);
  return out && out.size < file.size ? { blob: out, mime: outMime } : { blob: file, mime };
}

/**
 * Tải một ảnh lên và trả về địa chỉ (URL) để lưu vào điểm.
 * Có Supabase: tải vào bucket "poi-media" (Storage). Chưa có: đổi ảnh thành data URL để chạy thử (dữ liệu giả).
 * Bucket cũng giới hạn loại file và dung lượng ở phía máy chủ.
 */
export async function uploadImage(file: File): Promise<string> {
  const { blob, mime } = await prepare(file);

  const sb = getBackend();
  if (sb) {
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const path = `pois/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('poi-media').upload(path, blob, { contentType: mime, cacheControl: '3600' });
    if (error) throw new Error(`Lỗi tải ảnh lên: ${error.message}`);
    return sb.storage.from('poi-media').getPublicUrl(path).data.publicUrl;
  }

  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Không đọc được ảnh'));
    fr.readAsDataURL(blob);
  });
}
