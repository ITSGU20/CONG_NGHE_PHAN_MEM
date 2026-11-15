import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Admin nằm ở /<tên-repo>/admin/ trên GitHub Pages (cùng một site với web du khách).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/CONG_NGHE_PHAN_MEM/admin/' : '/',
  server: { port: 5174 },
}));
