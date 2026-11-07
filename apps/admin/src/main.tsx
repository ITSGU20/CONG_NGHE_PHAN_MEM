import { initBackend } from '@ddl/shared';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

// Có biến môi trường Supabase thì dùng Supabase, không thì chạy bằng dữ liệu giả (xem .env.example)
// detectSessionInUrl: để liên kết "đặt lại mật khẩu" trong email (UC6, A1) tạo được phiên khôi phục
initBackend({ url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY, detectSessionInUrl: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
