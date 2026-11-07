import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Gọi MỘT lần ở file khởi động của mỗi app. Thiếu url/anonKey => chạy bằng dữ liệu giả (mock).
 * Chỉ dùng "anon key" (khóa công khai); quyền thật do Row Level Security trong supabase/schema.sql quyết định.
 * KHÔNG bao giờ đưa "service_role key" vào FE.
 */
export function initBackend(cfg: { url?: string; anonKey?: string; persistSession?: boolean; detectSessionInUrl?: boolean }): boolean {
  if (!cfg.url || !cfg.anonKey) {
    client = null;
    return false;
  }
  const persist = cfg.persistSession ?? true;
  client = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: persist, autoRefreshToken: persist, detectSessionInUrl: cfg.detectSessionInUrl ?? false },
  });
  return true;
}

export const getBackend = () => client;
export const isBackendEnabled = () => client !== null;
