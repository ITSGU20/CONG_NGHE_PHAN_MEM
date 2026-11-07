import { getAudit, LANGUAGES, type AuditEntry } from '@ddl/shared';
import { useEffect, useState } from 'react';

const langLabel = (c?: string) => LANGUAGES.find((l) => l.code === c)?.label ?? '';

/** Nhật ký chỉnh sửa (BR-12): chỉ xem, không sửa hay xóa */
export default function AuditPage() {
  const [list, setList] = useState<AuditEntry[]>([]);
  useEffect(() => { getAudit().then(setList); }, []);
  return (
    <div className="pad">
      <h1>Nhật ký chỉnh sửa</h1>
      <table>
        <thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Điểm</th><th>Ngôn ngữ</th><th>Thao tác</th></tr></thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.at).toLocaleString('vi-VN')}</td>
              <td>{a.user}</td>
              <td>{a.poiId}</td>
              <td>{langLabel(a.lang)}</td>
              <td>{a.action}</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={5}>Chưa có thao tác nào.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
