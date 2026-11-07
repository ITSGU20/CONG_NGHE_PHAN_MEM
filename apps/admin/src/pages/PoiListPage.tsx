import { createPoi, getAdminPois, langCompleteness, LANGUAGES, poiStatus, setHidden, type Poi, type PoiStatus } from '@ddl/shared';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const LABEL: Record<PoiStatus, string> = {
  published: 'Đã xuất bản',
  changed: 'Đã xuất bản, có thay đổi chưa xuất bản',
  draft: 'Nháp',
  hidden: 'Ẩn',
};

/** UC8 – Danh sách điểm: số thứ tự, tên, trạng thái, mức đầy đủ nội dung theo ngôn ngữ (bước 3); thêm điểm (bước 4) */
export default function PoiListPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [pois, setPois] = useState<Poi[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => getAdminPois().then(setPois).catch((e: Error) => setMsg('Lỗi: ' + e.message)), []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    try {
      nav(`/pois/${await createPoi(user!.username)}`);
    } catch (e) {
      setMsg('Lỗi: ' + (e as Error).message);
    }
  };
  const toggleHidden = async (p: Poi) => {
    try {
      await setHidden(user!.username, p.id, !p.hidden);
      setMsg('');
      load();
    } catch (e) {
      setMsg('Lỗi: ' + (e as Error).message);
    }
  };

  return (
    <div className="pad">
      <div className="headrow">
        <h1>Điểm tham quan</h1>
        <button className="btn primary" onClick={add}>+ Thêm điểm</button>
      </div>
      {msg && <p className="notice">{msg}</p>}

      <p className="completeness">
        {LANGUAGES.map((l) => {
          const c = langCompleteness(pois, l.code);
          return <span key={l.code} className={'chip' + (c.done === c.total && c.total > 0 ? ' ok' : '')}>{l.label}: {c.done}/{c.total}</span>;
        })}
      </p>

      <table>
        <thead><tr><th>Số</th><th>Tên nội bộ</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>
          {pois.map((p) => {
            const st = poiStatus(p);
            return (
              <tr key={p.id}>
                <td>{p.number}</td>
                <td>{p.internalName}</td>
                <td><span className={`tag ${st}`}>{LABEL[st]}</span></td>
                <td className="actions">
                  <Link className="btn" to={`/pois/${p.id}`}>Sửa</Link>
                  <button className="btn" onClick={() => toggleHidden(p)}>{p.hidden ? 'Hiện' : 'Ẩn'}</button>
                </td>
              </tr>
            );
          })}
          {pois.length === 0 && <tr><td colSpan={4}>Chưa có điểm nào. Chọn “Thêm điểm” để bắt đầu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
