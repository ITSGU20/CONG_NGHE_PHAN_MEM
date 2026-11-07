import { DESKTOP_MIN_WIDTH } from '@ddl/shared';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, can, useAuth } from './auth';
import AuditPage from './pages/AuditPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PoiEditPage from './pages/PoiEditPage';
import PoiListPage from './pages/PoiListPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { confirmLeave } from './unsaved';

/** UI-03: trên điện thoại chỉ hiện thông báo, không hiển thị số liệu */
function useIsDesktop() {
  const [ok, setOk] = useState(window.innerWidth >= DESKTOP_MIN_WIDTH);
  useEffect(() => {
    const on = () => setOk(window.innerWidth >= DESKTOP_MIN_WIDTH);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return ok;
}

const ROLE_LABEL = { admin: 'Quản trị viên', editor: 'Biên tập viên', viewer: 'Chỉ xem' } as const;
/** UI-07: liên kết rời khỏi trang đang sửa dở thì hỏi xác nhận */
const guardLeave = (e: MouseEvent<HTMLAnchorElement>) => {
  if (!confirmLeave()) e.preventDefault();
};

function Shell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <nav>
        <h2>Quản trị</h2>
        {can.dashboard(user.role) && <NavLink to="/dashboard" onClick={guardLeave}>Dashboard</NavLink>}
        {can.content(user.role) && <NavLink to="/pois" onClick={guardLeave}>Điểm tham quan</NavLink>}
        {can.content(user.role) && <NavLink to="/audit" onClick={guardLeave}>Nhật ký</NavLink>}
        <div className="spacer" />
        <small>{user.username} ({ROLE_LABEL[user.role]})</small>
        <button className="btn" onClick={() => confirmLeave() && signOut()}>Đăng xuất</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}

function Guard({ allow, children }: { allow: 'dashboard' | 'content'; children: ReactNode }) {
  const { user } = useAuth();
  if (user && !can[allow](user.role)) return <p className="pad">Bạn không có quyền truy cập mục này.</p>;
  return <>{children}</>;
}

function Routed() {
  const { user } = useAuth();
  const home = user && can.dashboard(user.role) ? '/dashboard' : '/pois';
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard" element={<Shell><Guard allow="dashboard"><DashboardPage /></Guard></Shell>} />
      <Route path="/pois" element={<Shell><Guard allow="content"><PoiListPage /></Guard></Shell>} />
      <Route path="/pois/:id" element={<Shell><Guard allow="content"><PoiEditPage /></Guard></Shell>} />
      <Route path="/audit" element={<Shell><Guard allow="content"><AuditPage /></Guard></Shell>} />
      <Route path="*" element={<Navigate to={user ? home : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  const desktop = useIsDesktop();
  if (!desktop) {
    return (
      <div className="blocked">
        <h2>Vui lòng mở bằng máy tính</h2>
        <p>Trang quản trị chỉ hỗ trợ màn hình từ {DESKTOP_MIN_WIDTH}px trở lên.</p>
      </div>
    );
  }
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  );
}
