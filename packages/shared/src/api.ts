import {
  CAPTION_MAX, DESC_MAX, LOGIN_LOCK_MIN, LOGIN_MAX_FAILS, MAX_IMAGES_PER_POI, NAME_MAX,
} from './constants';
import { demoAccounts, seedPois } from './mockData';
import { storage } from './storage';
import { getBackend } from './supabase';
import type { AuditEntry, LangCode, LoginResult, Poi, PoiMeta, PoiVersion, Role, Stats, StatsFilter } from './types';
import { LANGUAGES } from './types';

/**
 * Lớp gọi dữ liệu. Có cấu hình Supabase (initBackend) => dùng Supabase; không thì dùng dữ liệu giả (localStorage).
 * Tên hàm và kiểu trả về giống nhau ở hai chế độ nên giao diện không cần biết đang dùng chế độ nào.
 */
const POIS_KEY = 'ddl.pois';
const AUDIT_KEY = 'ddl.audit';
const LOCK_KEY = 'ddl.admin.lock';
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Hai người cùng sửa một điểm (UC8, E4): bản nháp đã bị người khác lưu hoặc xuất bản từ lúc mở */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

const toError = (message: string) =>
  message.startsWith('CONFLICT:') ? new ConflictError(message.slice('CONFLICT:'.length).trim()) : new Error(message);
const fail = (error: { message: string } | null) => {
  if (error) throw toError(error.message);
};

/* =============================== Dữ liệu giả =============================== */
function loadPois(): Poi[] {
  const raw = storage.get(POIS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as Poi[];
    } catch {
      /* dữ liệu hỏng: dùng lại dữ liệu mẫu */
    }
  }
  return seedPois();
}
const savePois = (p: Poi[]) => storage.set(POIS_KEY, JSON.stringify(p));

function loadAudit(): AuditEntry[] {
  try {
    return JSON.parse(storage.get(AUDIT_KEY) ?? '[]') as AuditEntry[];
  } catch {
    return [];
  }
}
function mockAudit(user: string, poiId: string, action: string, lang?: LangCode) {
  const list = loadAudit();
  list.unshift({ id: String(Date.now() + Math.random()), at: new Date().toISOString(), user, poiId, lang, action });
  storage.set(AUDIT_KEY, JSON.stringify(list.slice(0, 200)));
}

/* ============================== Supabase helpers ============================ */
interface PoiRow {
  id: string;
  number: number;
  internal_name: string;
  type: Poi['type'];
  map_x: number;
  map_y: number;
  wheelchair: boolean;
  hidden: boolean;
  poi_versions?: {
    kind: 'published' | 'draft';
    images: string[];
    content: PoiVersion['content'];
    meta?: Partial<PoiMeta> | null;
    updated_at?: string | null;
  }[];
}

function rowToPoi(r: PoiRow): Poi {
  const pick = (k: 'published' | 'draft'): PoiVersion | undefined => {
    const v = r.poi_versions?.find((x) => x.kind === k);
    if (!v) return undefined;
    const hasMeta = !!v.meta && Object.keys(v.meta).length > 0;
    return {
      images: v.images ?? [],
      content: v.content ?? {},
      meta: k === 'draft' && hasMeta ? (v.meta as PoiMeta) : undefined,
      updatedAt: v.updated_at ?? null,
    };
  };
  return {
    id: r.id,
    number: r.number,
    internalName: r.internal_name,
    type: r.type,
    mapX: Number(r.map_x),
    mapY: Number(r.map_y),
    wheelchair: r.wheelchair,
    hidden: r.hidden,
    published: pick('published'),
    draft: pick('draft'),
  };
}

async function sbAudit(user: string, poiId: string, action: string, lang?: LangCode) {
  const sb = getBackend()!;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  const { error } = await sb.from('audit_log').insert({ user_id: uid, username: user, poi_id: poiId, lang, action });
  if (error) throw new Error(error.message);
}

/* ================================= Du khách ================================ */
/** Chỉ thấy điểm đã xuất bản và không bị ẩn (BR-05) */
export async function getVisitorPois(): Promise<Poi[]> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb.rpc('get_visitor_pois');
    fail(error);
    return (data ?? []) as Poi[];
  }
  await delay();
  return clone(loadPois().filter((p) => p.published && !p.hidden).sort((a, b) => a.number - b.number));
}

/* ============================ Đăng nhập quản trị (UC6) ====================== */
interface LockState {
  fails: number;
  until: number; // mốc thời gian (ms) hết khóa, 0 = không khóa
}
const lockKey = (id: string) => id.trim().toLowerCase();
function readLocks(): Record<string, LockState> {
  try {
    return JSON.parse(storage.get(LOCK_KEY) ?? '{}') as Record<string, LockState>;
  } catch {
    return {};
  }
}
const writeLocks = (m: Record<string, LockState>) => storage.set(LOCK_KEY, JSON.stringify(m));

/**
 * E1: sai thông tin => báo chung, không nói cái nào sai. E2: sai LOGIN_MAX_FAILS lần liên tiếp => khóa LOGIN_LOCK_MIN phút.
 * Lưu ý: đếm ở phía trình duyệt chỉ để báo người dùng; chặn thật sự do giới hạn tốc độ đăng nhập của Supabase Auth.
 */
export async function login(identifier: string, password: string): Promise<LoginResult> {
  const key = lockKey(identifier);
  const locks = readLocks();
  const st = locks[key] ?? { fails: 0, until: 0 };
  if (st.until > Date.now()) return { ok: false, reason: 'locked', minutesLeft: Math.ceil((st.until - Date.now()) / 60_000) };

  const result = await tryLogin(identifier, password);
  if (result) {
    delete locks[key];
    writeLocks(locks);
    return { ok: true, user: result };
  }
  const fails = st.until && st.until <= Date.now() ? 1 : st.fails + 1;
  if (fails >= LOGIN_MAX_FAILS) {
    locks[key] = { fails: 0, until: Date.now() + LOGIN_LOCK_MIN * 60_000 };
    writeLocks(locks);
    return { ok: false, reason: 'locked', minutesLeft: LOGIN_LOCK_MIN };
  }
  locks[key] = { fails, until: 0 };
  writeLocks(locks);
  return { ok: false, reason: 'invalid' };
}

async function tryLogin(identifier: string, password: string): Promise<{ username: string; role: Role } | null> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email: identifier, password });
    if (error || !data.user) return null;
    const { data: prof } = await sb.from('profiles').select('username, role').eq('id', data.user.id).maybeSingle();
    if (!prof) {
      await sb.auth.signOut(); // đăng nhập được nhưng chưa được cấp vai trò => không cho vào
      return null;
    }
    return { username: prof.username as string, role: prof.role as Role };
  }
  await delay();
  const acc = demoAccounts.find((a) => a.username === identifier && a.password === password);
  return acc ? { username: acc.username, role: acc.role } : null;
}

export async function logout(): Promise<void> {
  await getBackend()?.auth.signOut();
}

/** A1: gửi liên kết đặt lại mật khẩu (có thời hạn) tới email. Luôn báo thành công để không lộ email nào có tài khoản. */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const sb = getBackend();
  if (!sb) {
    await delay();
    return;
  }
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error && !/not found|invalid/i.test(error.message)) throw new Error(error.message);
}

/** Đặt mật khẩu mới sau khi bấm liên kết trong email (phiên khôi phục do Supabase tạo) */
export async function setNewPassword(password: string): Promise<void> {
  const sb = getBackend();
  if (!sb) throw new Error('Chưa nối Supabase, không có chức năng đặt lại mật khẩu');
  const { error } = await sb.auth.updateUser({ password });
  fail(error);
}

/** Có phiên khôi phục/đăng nhập hợp lệ ở Supabase không (dùng cho trang đặt lại mật khẩu và kiểm tra phiên) */
export async function hasSession(): Promise<boolean> {
  const sb = getBackend();
  if (!sb) return true; // dữ liệu giả: phiên chỉ nằm ở sessionStorage của trang quản trị
  const { data } = await sb.auth.getSession();
  return !!data.session;
}

/** A2: phiên hết hạn hoặc bị hủy => gọi cb. Trả về hàm hủy đăng ký. */
export function onSessionEnd(cb: () => void): () => void {
  const sb = getBackend();
  if (!sb) return () => undefined;
  const { data } = sb.auth.onAuthStateChange((evt) => {
    if (evt === 'SIGNED_OUT') cb();
  });
  return () => data.subscription.unsubscribe();
}

/* ============================ Quản lý điểm tham quan (UC8) ================= */
export async function getAdminPois(): Promise<Poi[]> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb
      .from('pois')
      .select('id, number, internal_name, type, map_x, map_y, wheelchair, hidden, poi_versions(kind, images, content, meta, updated_at)')
      .order('number');
    fail(error);
    return ((data ?? []) as unknown as PoiRow[]).map(rowToPoi);
  }
  await delay();
  return clone(loadPois().sort((a, b) => a.number - b.number));
}

export type PoiStatus = 'published' | 'changed' | 'draft' | 'hidden';
export function poiStatus(p: Poi): PoiStatus {
  if (p.hidden) return 'hidden';
  if (!p.published) return 'draft';
  return p.draft ? 'changed' : 'published';
}

/** Các trường chung đang hiệu lực của điểm (dùng làm giá trị ban đầu khi mở trang sửa) */
export const metaOf = (p: Poi): PoiMeta =>
  p.draft?.meta ?? { number: p.number, internalName: p.internalName, type: p.type, wheelchair: !!p.wheelchair, mapX: p.mapX, mapY: p.mapY };

/** Dấu thời gian của bản mà người sửa đang mở; gửi kèm khi lưu để phát hiện hai người cùng sửa (E4) */
export const editToken = (p: Poi): string | null => (p.draft ?? p.published)?.updatedAt ?? null;

/** Các trường bắt buộc để xuất bản (mục 8.4): ≥1 ảnh, tên + mô tả + thuyết minh tiếng Việt và tiếng Anh */
export function missingRequired(v: PoiVersion): string[] {
  const miss: string[] = [];
  if (v.images.length < 1) miss.push('ít nhất 1 ảnh');
  for (const l of ['vi', 'en'] as const) {
    const c = v.content[l];
    if (!c?.name?.trim()) miss.push(`tên (${l})`);
    if (!c?.description?.trim()) miss.push(`mô tả (${l})`);
    if (!c?.narration?.trim()) miss.push(`thuyết minh (${l})`);
  }
  if (!v.meta?.internalName?.trim()) miss.push('tên nội bộ');
  return miss;
}

/** E1: kiểm tra dữ liệu khi lưu; trả về danh sách lỗi (rỗng = hợp lệ). otherNumbers = số thứ tự của các điểm khác. */
export function validateDraft(v: PoiVersion, otherNumbers: number[]): string[] {
  const errs: string[] = [];
  const m = v.meta;
  if (m) {
    if (!Number.isInteger(m.number) || m.number < 1) errs.push('Số thứ tự phải là số nguyên dương');
    else if (otherNumbers.includes(m.number)) errs.push(`Số thứ tự ${m.number} đã được dùng cho điểm khác`);
    if (!m.internalName.trim()) errs.push('Tên nội bộ không được để trống');
    if (!(m.mapX >= 0 && m.mapX <= 100 && m.mapY >= 0 && m.mapY <= 100)) errs.push('Vị trí nằm ngoài ảnh bản đồ');
  }
  if (v.images.length > MAX_IMAGES_PER_POI) errs.push(`Tối đa ${MAX_IMAGES_PER_POI} ảnh mỗi điểm`);
  for (const [lang, c] of Object.entries(v.content)) {
    if (!c) continue;
    if (c.name.length > NAME_MAX) errs.push(`Tên hiển thị (${lang}) vượt quá ${NAME_MAX} ký tự`);
    if (c.description.length > DESC_MAX) errs.push(`Mô tả (${lang}) vượt quá ${DESC_MAX} ký tự`);
    for (const cap of Object.values(c.captions ?? {})) {
      if (cap.length > CAPTION_MAX) {
        errs.push(`Chú thích ảnh (${lang}) vượt quá ${CAPTION_MAX} ký tự`);
        break;
      }
    }
  }
  return errs;
}

/** Thêm điểm (UC8 bước 4): tạo điểm mới với số thứ tự kế tiếp, chưa hiển thị cho du khách vì chưa xuất bản */
export async function createPoi(user: string): Promise<string> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb.rpc('create_poi');
    fail(error);
    return data as string;
  }
  await delay();
  const all = loadPois();
  const number = Math.max(0, ...all.map((p) => p.number)) + 1;
  const id = `poi-${Date.now()}`;
  all.push({ id, number, internalName: `Điểm mới ${number}`, type: 'indoor', mapX: 50, mapY: 50, wheelchair: false, hidden: false });
  savePois(all);
  mockAudit(user, id, 'Thêm điểm');
  return id;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Lưu bản nháp (UC8 bước 8). Ném ConflictError nếu bản nháp đã bị người khác lưu/xuất bản từ lúc mở (E4). */
export async function saveDraft(user: string, poi: Poi, draft: PoiVersion): Promise<void> {
  const meta = draft.meta ?? metaOf(poi);
  const expected = editToken(poi);
  const sb = getBackend();
  if (sb) {
    const { error } = await sb.rpc('save_draft', {
      p_poi: poi.id,
      p_images: draft.images,
      p_content: draft.content,
      p_meta: meta,
      p_expected: expected,
    });
    return fail(error);
  }
  await delay();
  const all = loadPois();
  const p = all.find((x) => x.id === poi.id);
  if (!p) throw new Error('Không tìm thấy điểm');
  if (((p.draft ?? p.published)?.updatedAt ?? null) !== expected) {
    throw new ConflictError('Điểm này vừa được người khác lưu hoặc xuất bản. Hãy tải lại bản mới nhất.');
  }
  const errs = validateDraft({ ...draft, meta }, all.filter((x) => x.id !== p.id).map((x) => x.number));
  if (errs.length) throw new Error(errs[0]);

  const base = p.draft ?? p.published;
  const baseMeta = metaOf(p);
  p.draft = { images: clone(draft.images), content: clone(draft.content), meta: clone(meta), updatedAt: new Date().toISOString() };
  savePois(all);

  mockAudit(user, p.id, 'Lưu bản nháp');
  const langs = new Set([...Object.keys(base?.content ?? {}), ...Object.keys(draft.content)]) as Set<LangCode>;
  langs.forEach((l) => {
    if (!sameJson(base?.content[l], draft.content[l])) mockAudit(user, p.id, 'Sửa nội dung', l);
  });
  if (!sameJson(base?.images ?? [], draft.images)) mockAudit(user, p.id, 'Thay đổi ảnh');
  if (!sameJson(baseMeta, meta)) mockAudit(user, p.id, 'Sửa thông tin chung');
}

export async function publishDraft(user: string, poiId: string): Promise<void> {
  const sb = getBackend();
  if (sb) {
    const { error } = await sb.rpc('publish_poi', { p_poi: poiId }); // kiểm tra quyền, bắt buộc, ghi nhật ký ở phía máy chủ
    return fail(error);
  }
  await delay();
  const all = loadPois();
  const p = all.find((x) => x.id === poiId);
  if (!p?.draft) throw new Error('Không có bản nháp để xuất bản');
  const missing = missingRequired(p.draft);
  if (missing.length) throw new Error('Thiếu: ' + missing.join(', '));
  if (p.draft.meta) Object.assign(p, p.draft.meta);
  p.published = { images: p.draft.images, content: p.draft.content, updatedAt: new Date().toISOString() };
  p.draft = undefined;
  savePois(all);
  mockAudit(user, poiId, 'Xuất bản');
}

/** Hủy thay đổi (UC8, A7). Điểm mới chưa từng xuất bản thì xóa luôn điểm đó. */
export async function discardDraft(user: string, poiId: string): Promise<void> {
  const sb = getBackend();
  if (sb) {
    const { error } = await sb.rpc('discard_draft', { p_poi: poiId });
    return fail(error);
  }
  await delay();
  const all = loadPois();
  const p = all.find((x) => x.id === poiId);
  if (!p) return;
  if (!p.published) {
    savePois(all.filter((x) => x.id !== poiId));
    mockAudit(user, '-', `Hủy điểm mới: ${p.internalName}`);
    return;
  }
  p.draft = undefined;
  savePois(all);
  mockAudit(user, poiId, 'Hủy thay đổi');
}

/** Ẩn/hiện có hiệu lực trực tiếp, không qua nháp (BR-11) */
export async function setHidden(user: string, poiId: string, hidden: boolean): Promise<void> {
  const sb = getBackend();
  if (sb) {
    const { error } = await sb.from('pois').update({ hidden }).eq('id', poiId);
    fail(error);
    return sbAudit(user, poiId, hidden ? 'Ẩn điểm' : 'Hiện điểm');
  }
  await delay();
  const all = loadPois();
  const p = all.find((x) => x.id === poiId);
  if (p) p.hidden = hidden;
  savePois(all);
  mockAudit(user, poiId, hidden ? 'Ẩn điểm' : 'Hiện điểm');
}

/** Số điểm đã có đủ nội dung (tên + mô tả + thuyết minh) ở một ngôn ngữ, tính trên bản đang chỉnh/xuất bản (mục UC8 bước 3) */
export function langCompleteness(pois: Poi[], lang: LangCode): { done: number; total: number } {
  const done = pois.filter((p) => {
    const c = (p.draft ?? p.published)?.content[lang];
    return !!c?.name?.trim() && !!c.description?.trim() && !!c.narration?.trim();
  }).length;
  return { done, total: pois.length };
}

export async function getAudit(): Promise<AuditEntry[]> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb
      .from('audit_log')
      .select('id, at, username, lang, action, pois(number)')
      .order('at', { ascending: false })
      .limit(200);
    fail(error);
    return (data ?? []).map((r) => {
      const poi = r.pois as unknown as { number: number } | null;
      return { id: String(r.id), at: r.at as string, user: r.username as string, poiId: poi ? `Điểm ${poi.number}` : '-', lang: (r.lang ?? undefined) as LangCode | undefined, action: r.action as string };
    });
  }
  await delay();
  const pois = loadPois();
  return loadAudit().map((a) => {
    const p = pois.find((x) => x.id === a.poiId);
    return { ...a, poiId: p ? `Điểm ${p.number}` : '-' };
  });
}

/* ================================= Dashboard =============================== */
let tick = 0;
const DAY_MS = 86_400_000;
/** Ngày theo múi giờ Việt Nam (GMT+7) dạng YYYY-MM-DD */
export const vnDate = (d = new Date()) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export async function getStats(filter: StatsFilter = {}): Promise<Stats> {
  const sb = getBackend();
  if (sb) {
    const { data, error } = await sb.rpc('get_stats', { p_from: filter.from ?? null, p_to: filter.to ?? null, p_lang: filter.lang ?? null });
    fail(error);
    const d = data as Stats;
    const byLanguage = {} as Record<LangCode, number>;
    LANGUAGES.forEach((l) => (byLanguage[l.code] = Number(d.byLanguage?.[l.code] ?? 0)));
    return { totalUsers: Number(d.totalUsers), online: Number(d.online), playing: Number(d.playing), byLanguage, byDay: d.byDay ?? [] };
  }
  await delay(60);
  tick += 1;
  const wobble = (n: number, amp: number) => Math.max(0, Math.round(n + Math.sin(tick / 2) * amp));
  const online = wobble(42, 6);
  const byLanguage = {} as Record<LangCode, number>;
  LANGUAGES.forEach((l, i) => (byLanguage[l.code] = !filter.lang || filter.lang === l.code ? 400 - i * 55 + (tick % 5) : 0));
  const to = new Date(`${filter.to ?? vnDate()}T00:00:00Z`).getTime();
  const from = filter.from ? new Date(`${filter.from}T00:00:00Z`).getTime() : to - 6 * DAY_MS;
  const days = Math.min(366, Math.max(1, Math.round((to - from) / DAY_MS) + 1));
  const byDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(to - (days - 1 - i) * DAY_MS);
    return { date: d.toISOString().slice(5, 10), count: filter.lang && filter.lang !== 'vi' ? 20 + ((i * 11) % 30) : 120 + ((i * 37) % 90) };
  });
  return { totalUsers: 3280 + tick, online, playing: Math.min(online, wobble(17, 4)), byLanguage, byDay };
}
