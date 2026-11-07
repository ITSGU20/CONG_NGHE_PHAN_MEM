/**
 * Lưu dữ liệu đơn giản. Trên web dùng localStorage; nơi không có (React Native, chế độ riêng tư)
 * thì lùi về bộ nhớ tạm. Mọi thao tác được bọc try/catch vì localStorage có thể ném lỗi.
 */
const memory = new Map<string, string>();

export const storage = {
  get(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {
      /* bỏ qua */
    }
    return memory.get(key) ?? null;
  },
  set(key: string, value: string) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      /* bỏ qua */
    }
    memory.set(key, value);
  },
};
