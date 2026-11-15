import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages phục vụ web ở /<tên-repo>/ nên bản production (build và preview) phải khai báo thư mục này.
// Chạy thử khi sửa code (npm run dev) vẫn dùng '/'.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/CONG_NGHE_PHAN_MEM/' : '/',
  server: { port: 5173 },
}));