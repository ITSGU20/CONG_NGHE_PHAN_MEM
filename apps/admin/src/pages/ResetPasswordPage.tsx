import { hasSession, logout, setNewPassword } from '@ddl/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/** UC6 A1 (bước sau): người quản trị mở liên kết trong email và đặt mật khẩu mới */
export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Supabase đọc mã trong liên kết một cách bất đồng bộ nên chờ một lúc rồi mới kết luận liên kết không dùng được
  useEffect(() => {
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      if (await hasSession()) {
        setReady(true);
        clearInterval(id);
      } else if (tries >= 10) {
        setReady(false);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg('Mật khẩu cần tối thiểu 8 ký tự');
    if (pw !== pw2) return setMsg('Hai mật khẩu không khớp');
    setBusy(true);
    setMsg('');
    try {
      await setNewPassword(pw);
      await logout(); // phiên khôi phục chỉ dùng để đổi mật khẩu; đăng nhập lại bằng mật khẩu mới
      nav('/login', { replace: true });
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (ready === null) return <p className="pad">Đang kiểm tra liên kết…</p>;
  if (!ready) {
    return (
      <div className="login">
        <h1>Liên kết không hợp lệ</h1>
        <p>Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Hãy yêu cầu liên kết mới ở màn hình đăng nhập.</p>
        <button className="btn primary" onClick={() => nav('/login', { replace: true })}>Về đăng nhập</button>
      </div>
    );
  }
  return (
    <form className="login" onSubmit={submit}>
      <h1>Đặt mật khẩu mới</h1>
      <input type="password" placeholder="Mật khẩu mới (tối thiểu 8 ký tự)" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <input type="password" placeholder="Nhập lại mật khẩu mới" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      {msg && <p className="err">{msg}</p>}
      <button className="btn primary" disabled={busy || !pw || !pw2}>Lưu mật khẩu</button>
    </form>
  );
}
