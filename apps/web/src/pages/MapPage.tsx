import {
  resolveContent,
  track,
  FLOORS,
  DEFAULT_FLOOR,
  floorName,
  floorOf,
  type FloorId,
  type Poi,
} from '@ddl/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import Header from '../components/Header';
import MapView from '../components/MapView';
import { IconMap, IconMinus, IconPlus, IconReset, TypeIcon } from '../components/icons';

export default function MapPage() {
  const { lang, pois, loaded, loadError, reload, heard, tr } = useApp();
  const nav = useNavigate();

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [floor, setFloor] = useState<FloorId>(DEFAULT_FLOOR);
  // Mặc định đóng sidebar để hiện nút "Điểm tham quan" + danh sách tầng nổi góc trái như ảnh
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Tầng đang được xổ danh sách địa điểm bên trong sidebar
  const [expandedFloor, setExpandedFloor] = useState<FloorId | null>(null);

  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Nhóm các điểm tham quan theo từng tầng
  const poisByFloor = useMemo(() => {
    const map: Record<string, Poi[]> = {};
    for (const f of FLOORS) map[f.id] = [];
    for (const p of pois) {
      const fId = floorOf(p);
      if (!map[fId]) map[fId] = [];
      map[fId].push(p);
    }
    return map;
  }, [pois]);

  // Tự động cuộn tới thẻ tương ứng khi di chuột vào Pin trên bản đồ
  useEffect(() => {
    if (!hoverId || !sidebarOpen) return;
    const el = cardRefs.current[hoverId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hoverId, sidebarOpen]);

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleToggleFloorInSidebar = (fId: FloorId) => {
    if (floor !== fId) {
      setFloor(fId);
      setZoom(1);
    }
    setExpandedFloor((prev) => (prev === fId ? null : fId));
  };

  const open = (p: Poi, how: 'map' | 'list') => {
    track('poi_open', { poiId: p.id, how });
    nav(`/poi/${p.id}`, { state: { how } });
  };

  const clamp = (z: number) => Math.min(2.6, Math.max(1, Math.round(z * 10) / 10));

  const totalHeard = useMemo(
    () => pois.filter((p) => heard.has(p.id)).length,
    [pois, heard]
  );

  return (
      <div className="page map-page">
      <Header />
      <div className="split">
        {/* SIDEBAR ĐIỂM THAM QUAN (TRƯỢT RA KHI ẤN NÚT, ĐÓNG LẠI KHI ẤN <) */}
        <aside className={'list' + (sidebarOpen ? '' : ' collapsed')}>
          <div className="list-top">
            <div className="list-head">
              <div className="list-title-wrap">
                <span className="list-badge-icon">
                  <IconMap size={20} />
                </span>
                <div>
                  <h2>{tr('list')}</h2>
                  <p className="list-sub">{tr('selectFloorHint')}</p>
                </div>
              </div>

              <div className="list-head-actions">
                {pois.length > 0 && (
                  <span className="total-badge" title={tr('mapHeardTotal')}>
                    {totalHeard}/{pois.length}
                  </span>
                )}
                <button
                  type="button"
                  className="collapse-btn"
                  onClick={handleCloseSidebar}
                  title={tr('mapCloseList')}
                  aria-label={tr('mapCloseList')}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="list-body">
            {!loaded && (
              <div className="empty-state">
                <p>{tr('loading')}</p>
              </div>
            )}

            {loaded && loadError && pois.length === 0 && (
              <div className="empty-state">
                <p>{tr('loadError')}</p>
                <button className="retrybtn" onClick={reload}>
                  {tr('retry')}
                </button>
              </div>
            )}

            {/* DANH SÁCH CÁC TẦNG TRONG SIDEBAR -> ẤN VÀO HIỆN ĐỊA ĐIỂM THAM QUAN */}
            {loaded && (
              <div className="floor-accordion">
                {FLOORS.map((f) => {
                  const list = poisByFloor[f.id] ?? [];
                  const isExpanded = expandedFloor === f.id;
                  const isCurrentFloor = floor === f.id;
                  const heardCount = list.filter((p) => heard.has(p.id)).length;

                  return (
                    <div
                      key={f.id}
                      className={
                        'floor-group' +
                        (isExpanded ? ' open' : '') +
                        (isCurrentFloor ? ' current' : '')
                      }
                    >
                      <button
                        type="button"
                        className="floor-trigger"
                        onClick={() => handleToggleFloorInSidebar(f.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="floor-trigger-left">
                          <span className="floor-dot" />
                          <div className="floor-trigger-text">
                            <b>{floorName(f.id, lang)}</b>
                            <small>
                                {list.length > 0
                                ? tr('mapPointCount').replace('{count}', String(list.length))
                                : tr('mapEmptyFloor')}
                                {heardCount > 0 && ` · ${tr('heard')} ${heardCount}`}
                            </small>
                          </div>
                        </div>

                        <div className="floor-trigger-right">
                          <span className="floor-pill-count">{list.length}</span>
                          <svg
                            className="chevron"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      </button>

                      {/* DANH SÁCH ĐỊA ĐIỂM THAM QUAN XỔ RA KHI ẤN VÀO TẦNG */}
                      <div className="floor-collapse">
                        <div className="floor-collapse-inner">
                          {list.length === 0 ? (
                            <p className="floor-empty-note">
                              {tr('mapEmptyFloor')}
                            </p>
                          ) : (
                            <ul className="poi-sublist">
                              {list.map((p) => {
                                const r = resolveContent(p.published, lang);
                                const isHeard = heard.has(p.id);
                                const isHover = hoverId === p.id;

                                return (
                                  <li
                                    key={p.id}
                                    ref={(el) => {
                                      cardRefs.current[p.id] = el;
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className={
                                        'poi-card' +
                                        (isHover ? ' on' : '') +
                                        (isHeard ? ' heard' : '')
                                      }
                                      onClick={() => open(p, 'list')}
                                      onMouseEnter={() => setHoverId(p.id)}
                                      onMouseLeave={() => setHoverId(null)}
                                    >
                                      <div className="poi-card-left">
                                        <span
                                          className={'num' + (isHeard ? ' heard' : '')}
                                        >
                                          {p.number}
                                        </span>
                                      </div>

                                      <div className="poi-card-main">
                                        <div className="poi-card-header">
                                          <b>{r.content?.name || `${tr('point')} #${p.number}`}</b>
                                          <span
                                            className="poi-type-badge"
                                            title={{outdoor: tr('typeOutdoor'), indoor: tr('typeIndoor'), mixed: tr('typeMixed'),}[p.type]}
                                          >
                                            <TypeIcon type={p.type} />
                                          </span>
                                        </div>

                                        <p className="poi-card-desc">
                                          {r.content?.description ||
                                            tr('mapPoiHint')}
                                        </p>

                                        <div className="poi-card-meta">
                                          {isHeard ? (
                                            <span className="status-tag heard">
                                              ✓ {tr('heard')}
                                            </span>
                                          ) : (
                                            <span className="status-tag">
                                              ● {tr('notHeard')}
                                            </span>
                                          )}
                                          <span className="action-hint">
                                            {tr('explore')} →
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* KHUNG HIỂN THỊ BẢN ĐỒ */}
        <section className="mappanel">
          {/* CHỈ HIỆN NÚT "ĐIỂM THAM QUAN" + DANH SÁCH TẦNG BÊN NGOÀI KHI SIDEBAR ĐANG ĐÓNG */}
          {!sidebarOpen && (
            <div className="map-left-overlay">
              <button
                type="button"
                className="poi-toggle-btn"
                onClick={handleOpenSidebar}
              >
                <IconMap size={18} />
                <span>{tr('list')}</span>
              </button>

              <div className="floors" role="tablist">
                {FLOORS.map((f) => {
                  const count = (poisByFloor[f.id] ?? []).length;
                  return (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={f.id === floor}
                      className={f.id === floor ? 'on' : ''}
                      onClick={() => {
                        setFloor(f.id);
                        setZoom(1);
                      }}
                    >
                      <span>{floorName(f.id, lang)}</span>
                      {count > 0 && <em className="floor-count">{count}</em>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mapscroll">
            <MapView
              floor={floor}
              pois={pois}
              heard={heard}
              hoverId={hoverId}
              zoom={zoom}
              onHover={setHoverId}
              onPick={(p) => open(p, 'map')}
            />
          </div>

          <div className="zoomctl">
            <button
              onClick={() => setZoom(clamp(zoom + 0.4))}
              aria-label={tr('zoomIn')}
              title={tr('zoomIn')}
            >
              <IconPlus />
            </button>
            <button
              onClick={() => setZoom(clamp(zoom - 0.4))}
              aria-label={tr('zoomOut')}
              title={tr('zoomOut')}
            >
              <IconMinus />
            </button>
            <button
              onClick={() => setZoom(1)}
              aria-label={tr('zoomReset')}
              title={tr('zoomReset')}
            >
              <IconReset />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}