import 'react-native-url-polyfill/auto'; // cần cho thư viện Supabase chạy trên React Native
import { initBackend } from '@ddl/shared';
import { registerRootComponent } from 'expo';
import App from './App';

// Biến EXPO_PUBLIC_* được Expo nhúng vào lúc build. Không có => dùng dữ liệu giả (xem .env.example)
// Du khách không đăng nhập nên không cần lưu phiên.
initBackend({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  persistSession: false,
});

registerRootComponent(App);
