import 'react-native-url-polyfill/auto'; // cần cho thư viện Supabase chạy trên React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initBackend } from '@ddl/shared';
import { registerRootComponent } from 'expo';
import { createElement, useEffect, useState } from 'react';
import App from './App';

// Biến EXPO_PUBLIC_* được Expo nhúng vào lúc build. Không có => dùng dữ liệu giả (xem .env.example)
// Du khách không đăng nhập nên không cần lưu phiên.
initBackend({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  persistSession: false,
});

// Các khóa mà packages/shared và App.tsx đang dùng với storage
const KEYS = ['ddl.lang', 'ddl.deviceId', 'ddl.heard'];

// Gắn localStorage NGAY khi file được nạp (đọc từ bộ nhớ, ghi đồng thời xuống AsyncStorage).
// Lúc này bộ nhớ còn trống, dữ liệu cũ được nạp vào ở Root bên dưới trước khi App hiện ra.
const cache = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => cache.get(k) ?? null,
  setItem: (k: string, v: string) => {
    cache.set(k, v);
    AsyncStorage.setItem(k, v).catch(() => undefined);
  },
};

/** Chờ nạp dữ liệu đã lưu rồi mới hiện App, để lần render đầu đọc đúng ngôn ngữ đã chọn */
function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.multiGet(KEYS)
      .then((pairs) => pairs.forEach(([k, v]) => v !== null && cache.set(k, v)))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);
  return ready ? createElement(App) : null;
}

// Đăng ký NGAY, không chờ gì cả
registerRootComponent(Root);