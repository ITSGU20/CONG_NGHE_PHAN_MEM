import { hasSession, logout, onSessionEnd, type Role } from '@ddl/shared';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface User {
  username: string;
  role: Role;
}
interface AuthCtx {
  user: User | null;
  signIn: (u: User) => void;
  signOut: () => void;
}
const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

const KEY = 'ddl.admin.user';
export const EXPIRED_KEY = 'ddl.admin.expired';
function read(): User | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(read);
  const manual = useRef(false);

  const clear = (expired: boolean) => {
    try {
      sessionStorage.removeItem(KEY);
      if (expired) sessionStorage.setItem(EXPIRED_KEY, '1');
    } catch { /* bỏ qua */ }
    setUser(null);
  };

  // UC6 A2: phiên hết hạn (hoặc đã bị hủy ở nơi khác) => hủy phiên và quay lại màn đăng nhập
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void hasSession().then((ok) => {
      if (alive && !ok) clear(true);
    });
    const off = onSessionEnd(() => {
      if (alive && !manual.current) clear(true);
    });
    return () => {
      alive = false;
      off();
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = (u: User) => {
    manual.current = false;
    try { sessionStorage.setItem(KEY, JSON.stringify(u)); } catch { /* bỏ qua */ }
    setUser(u);
  };
  const signOut = () => {
    manual.current = true;
    void logout();
    clear(false);
  };
  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>;
}

/** Quyền theo BR-09 (đề xuất): editor sửa nội dung, không xem dashboard; viewer chỉ xem dashboard */
export const can = {
  dashboard: (r: Role) => r === 'admin' || r === 'viewer',
  content: (r: Role) => r === 'admin' || r === 'editor',
};
