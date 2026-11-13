
import { getAudit, LANGUAGES, type AuditEntry } from '@ddl/shared';
import { useEffect, useState } from 'react';

const langLabel = (c?: string) =>
  LANGUAGES.find((l) => l.code === c)?.label ?? '';

/** Nhật ký chỉnh sửa: chỉ xem, không sửa hay xóa */
export default function AuditPage() {
  const [list, setList] = useState<AuditEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getAudit(selectedDate || undefined);

        if (active) {
          setList(data);
        }
      } catch (e) {
        if (active) {
          setError('Không thể tải nhật ký: ' + (e as Error).message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  return (
    <div className="pad">
      <div className="headrow">
        <div>
          <h1>Nhật ký chỉnh sửa</h1>
          <p className="muted">
            Theo dõi các thao tác của người dùng trên hệ thống.
          </p>
        </div>
      </div>

      {/* Bộ lọc ngày */}
      <section className="audit-filter">
        <label>
          <span>Chọn ngày xem nhật ký</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>

        <button
          className="btn"
          type="button"
          onClick={() => setSelectedDate('')}
          disabled={!selectedDate}
        >
          Xóa bộ lọc
        </button>

        <div className="audit-count">
          {selectedDate
            ? `Nhật ký ngày ${selectedDate.split('-').reverse().join('/')}`
            : '200 nhật ký gần nhất'}
          {' · '}
          <strong>{list.length}</strong> bản ghi
        </div>
      </section>

      {error && <p className="notice">{error}</p>}

      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Người thực hiện</th>
              <th>Điểm</th>
              <th>Ngôn ngữ</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="audit-empty">
                  Đang tải nhật ký...
                </td>
              </tr>
            ) : list.length > 0 ? (
              list.map((a) => (
                <tr key={a.id}>
                  <td>
                    {new Date(a.at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </td>
                  <td>{a.user}</td>
                  <td>{a.poiId}</td>
                  <td>{langLabel(a.lang) || '—'}</td>
                  <td>{a.action}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="audit-empty">
                  {selectedDate
                    ? 'Không có nhật ký nào trong ngày được chọn.'
                    : 'Chưa có thao tác nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
