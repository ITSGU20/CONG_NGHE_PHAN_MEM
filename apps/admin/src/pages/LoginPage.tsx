import { isBackendEnabled, login, requestPasswordReset } from '@ddl/shared';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EXPIRED_KEY, useAuth } from '../auth';

/** UC6 – Đăng nhập quản trị (kèm quên mật khẩu A1, báo sai thông tin E1, khóa tạm E2) */
export default function LoginPage() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() => {
    try {
      const expired = sessionStorage.getItem(EXPIRED_KEY);
      sessionStorage.removeItem(EXPIRED_KEY);
      return expired ? 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.' : '';
    } catch {
      return '';
    }
  });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    const res = await login(username.trim(), password);
    setBusy(false);
    if (res.ok) {
      signIn(res.user);
      nav('/', { replace: true });
    } else if (res.reason === 'locked') {
      setError(`Đăng nhập sai quá nhiều lần. Tài khoản bị khóa tạm thời, vui lòng thử lại sau khoảng ${res.minutesLeft ?? ''} phút.`);
    } else {
      setError('Email hoặc mật khẩu không đúng'); // báo chung, không nói rõ cái nào sai (E1)
    }
  };

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordReset(username.trim(), `${window.location.origin}/reset-password`);
      setInfo('Nếu email này đã được đăng ký, liên kết đặt lại mật khẩu (có thời hạn) đã được gửi tới hộp thư của bạn.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <form className="login" onSubmit={sendReset}>
        <h1>Quên mật khẩu</h1>
        <input type="email" placeholder="Email đã đăng ký" value={username} onChange={(e) => setU(e.target.value)} autoFocus />
        {error && <p className="err">{error}</p>}
        {info && <p className="notice">{info}</p>}
        <button className="btn primary" disabled={busy || !username}>Gửi liên kết đặt lại mật khẩu</button>
        {!isBackendEnabled() && <small>Chế độ thử (chưa nối Supabase): không gửi email thật.</small>}
        <button type="button" className="btn" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>← Quay lại đăng nhập</button>
      </form>
    );
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>Đăng nhập quản trị</h1>
      <input placeholder={isBackendEnabled() ? 'Email' : 'Tên đăng nhập'} value={username} onChange={(e) => setU(e.target.value)} autoFocus />
      <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setP(e.target.value)} />
      {error && <p className="err">{error}</p>}
      {info && <p className="notice">{info}</p>}
      <button className="btn primary" disabled={busy || !username || !password}>Đăng nhập</button>
      <button type="button" className="linkbtn" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>Quên mật khẩu?</button>
      {!isBackendEnabled() && <small>Chế độ thử (chưa nối Supabase). Tài khoản demo: admin/admin123, editor/editor123, viewer/viewer123</small>}
    </form>
  );
}
