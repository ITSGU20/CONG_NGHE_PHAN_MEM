
import {
  createPoi,
  FLOORS,
  floorName,
  getAdminPois,
  langCompleteness,
  LANGUAGES,
  poiStatus,
  setHidden,
  type Poi,
  type PoiStatus,
} from '@ddl/shared';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const LABEL: Record<PoiStatus, string> = {
  published: 'Đã xuất bản',
  changed: 'Đã xuất bản, có thay đổi chưa xuất bản',
  draft: 'Nháp',
  hidden: 'Ẩn',
};

export default function PoiListPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [pois, setPois] = useState<Poi[]>([]);
  const [msg, setMsg] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');

  // Tải danh sách địa điểm
  const load = useCallback(
    () =>
      getAdminPois()
        .then(setPois)
        .catch((e: Error) => setMsg('Lỗi: ' + e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Tìm kiếm và lọc địa điểm
  const filteredPois = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase();

    return pois.filter((p) => {
      const matchesFloor =
        selectedFloor === 'all' || p.floor === Number(selectedFloor);

      if (!matchesFloor) return false;
      if (!q) return true;

      const localizedNames = LANGUAGES.flatMap((language) => [
        p.draft?.content?.[language.code]?.name,
        p.published?.content?.[language.code]?.name,
      ]);

      const searchableText = [
        String(p.number),
        p.internalName,
        ...localizedNames,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLocaleLowerCase();

      return searchableText.includes(q);
    });
  }, [pois, keyword, selectedFloor]);

  // Thêm địa điểm
  const add = async () => {
    try {
      nav(`/pois/${await createPoi(user!.username)}`);
    } catch (e) {
      setMsg('Lỗi: ' + (e as Error).message);
    }
  };

  // Ẩn hoặc hiện địa điểm
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
        <div>
          <h1>Điểm tham quan</h1>
          <p className="muted poi-subtitle">
            Quản lý danh sách và nội dung các điểm tham quan trong Dinh Độc Lập.
          </p>
        </div>

        <button className="btn primary" onClick={add}>
          + Thêm điểm
        </button>
      </div>

      {msg && <p className="notice">{msg}</p>}

      {/* Mức độ hoàn thiện nội dung đa ngôn ngữ */}
      <p className="completeness">
        {LANGUAGES.map((l) => {
          const c = langCompleteness(pois, l.code);

          return (
            <span
              key={l.code}
              className={
                'chip' +
                (c.done === c.total && c.total > 0 ? ' ok' : '')
              }
            >
              {l.label}: {c.done}/{c.total}
            </span>
          );
        })}
      </p>

      {/* Tìm kiếm và lọc tầng */}
      <section
        className="poi-toolbar"
        aria-label="Tìm kiếm và lọc điểm tham quan"
      >
        <label className="poi-search-field">
          <span>Tìm kiếm địa điểm</span>

          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Nhập số điểm hoặc tên địa điểm..."
          />
        </label>

        <label className="poi-floor-field">
          <span>Lọc theo tầng</span>

          <select
            value={selectedFloor}
            onChange={(event) => setSelectedFloor(event.target.value)}
          >
            <option value="all">Tất cả các tầng</option>

            {FLOORS.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floorName(floor.id, 'vi')}
              </option>
            ))}
          </select>
        </label>

        <div className="poi-result-count" aria-live="polite">
          Hiển thị <strong>{filteredPois.length}</strong> / {pois.length}{' '}
          địa điểm
        </div>
      </section>

      {/* Bảng danh sách địa điểm */}
      <div className="poi-table-wrap">
        <table className="poi-table">
          <thead>
            <tr>
              <th className="poi-number-col">Số</th>
              <th>Địa điểm</th>
              <th>Tầng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filteredPois.map((p) => {
              const st = poiStatus(p);

              const cover =
                p.draft?.images?.[0] || p.published?.images?.[0];

              const displayName =
                p.draft?.content?.vi?.name?.trim() ||
                p.published?.content?.vi?.name?.trim() ||
                p.internalName;

              return (
                <tr key={p.id}>
                  <td className="poi-number-cell">{p.number}</td>

                  <td>
                    <div className="poi-name-cell">
                      <div className="poi-thumb" aria-hidden="true">
                        <span>Chưa có ảnh</span>

                        {cover && (
                          <img
                            src={cover}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>

                      <div className="poi-name-text">
                        <strong>{displayName}</strong>
                        <span>{p.internalName}</span>
                      </div>
                    </div>
                  </td>

                  <td>{floorName(p.floor, 'vi')}</td>

                  <td>
                    <span className={`tag ${st}`}>{LABEL[st]}</span>
                  </td>

                  <td className="actions">
                    <Link className="btn" to={`/pois/${p.id}`}>
                      Sửa
                    </Link>

                    <button
                      className="btn"
                      onClick={() => toggleHidden(p)}
                    >
                      {p.hidden ? 'Hiện' : 'Ẩn'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredPois.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty poi-empty">
                    {pois.length === 0
                      ? 'Chưa có điểm tham quan. Chọn “Thêm điểm” để bắt đầu.'
                      : 'Không tìm thấy địa điểm phù hợp. Hãy thử từ khóa hoặc tầng khác.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
