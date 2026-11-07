import { HEARTBEAT_MS } from './constants';
import { storage } from './storage';
import { getBackend } from './supabase';
import type { EventName } from './types';

/** Mã thiết bị ngẫu nhiên, ẩn danh (BR-04, NFR-09). Không chứa vị trí hay danh tính. */
export function getDeviceId(): string {
  let id = storage.get('ddl.deviceId');
  if (!id) {
    id = 'd-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    storage.set('ddl.deviceId', id);
  }
  return id;
}

const sessionId = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
let playing = false;

/** Gửi sự kiện (mục 10.2) lên Supabase qua hàm track_event; chưa cấu hình thì chỉ ghi log. */
export function track(name: EventName, data: Record<string, unknown> = {}) {
  if (name === 'audio_play') playing = true;
  if (name === 'audio_pause' || name === 'audio_stop') playing = false;

  const sb = getBackend();
  if (!sb) {
    // eslint-disable-next-line no-console
    console.debug('[event]', name, data);
    return;
  }
  // gửi và bỏ qua kết quả: lỗi thống kê không được làm hỏng trải nghiệm của du khách
  sb.rpc('track_event', { p_name: name, p_session: sessionId, p_device: getDeviceId(), p_data: data }).then(
    () => undefined,
    () => undefined,
  );
}

/** Bắt đầu phiên và gửi heartbeat mỗi 30 giây. Trả về hàm dừng. */
export function startSession(initialLang: string) {
  track('session_start', { lang: initialLang });
  const timer = setInterval(() => track('heartbeat', { playing }), HEARTBEAT_MS);
  const g = globalThis as { addEventListener?: (t: string, f: () => void) => void };
  g.addEventListener?.('pagehide', () => track('session_end'));
  return () => {
    clearInterval(timer);
    track('session_end');
  };
}
