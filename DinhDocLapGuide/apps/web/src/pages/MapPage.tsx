import { resolveContent, track, type Poi } from '@ddl/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import Header from '../components/Header';
import MapView from '../components/MapView';
import { IconMap, IconMinus, IconPlus, IconReset, TypeIcon } from '../components/icons';

/** UC2 – Xem bản đồ và chọn điểm. Desktop: danh sách trái, bản đồ phải. Điện thoại: xếp dọc. */
export default function MapPage() {
  const { lang, pois, loaded, loadError, reload, heard, tr } = useApp();
  const nav = useNavigate();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const open = (p: Poi, how: 'map' | 'list') => {
    track('poi_open', { poiId: p.id, how });
    nav(`/poi/${p.id}`, { state: { how } });
  };
  const clamp = (z: number) => Math.min(2.6, Math.max(1, Math.round(z * 10) / 10));

  return (
    <div className="page">
      <Header />
      <div className="split">
        <aside className="list">
          <div className="list-head">
            <h2>{tr('list')}</h2>
            <span className="muted-icon"><IconMap size={22} /></span>
          </div>
          <ul>
            {!loaded && <li className="muted">{tr('loading')}</li>}
            {loaded && loadError && pois.length === 0 && (
              <li className="muted">
                {tr('loadError')} <button className="retrybtn" onClick={reload}>{tr('retry')}</button>
              </li>
            )}
            {pois.map((p) => {
              const r = resolveContent(p.published, lang);
              return (
                <li key={p.id}>
                  <button
                    className={'row' + (hoverId === p.id ? ' on' : '')}
                    onClick={() => open(p, 'list')}
                    onMouseEnter={() => setHoverId(p.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <span className={'num' + (heard.has(p.id) ? ' heard' : '')}>{p.number}</span>
                    <span className="rowtext">
                      <b>{r.content?.name}</b>
                      <small>{r.content?.description}</small>
                    </span>
                    <span className="rowicon"><TypeIcon type={p.type} /></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="mappanel">
          <div className="mapscroll">
            <MapView pois={pois} heard={heard} hoverId={hoverId} zoom={zoom} onHover={setHoverId} onPick={(p) => open(p, 'map')} />
          </div>
          <div className="zoomctl">
            <button onClick={() => setZoom(clamp(zoom + 0.4))} aria-label={tr('zoomIn')} title={tr('zoomIn')}><IconPlus /></button>
            <button onClick={() => setZoom(clamp(zoom - 0.4))} aria-label={tr('zoomOut')} title={tr('zoomOut')}><IconMinus /></button>
            <button onClick={() => setZoom(1)} aria-label={tr('zoomReset')} title={tr('zoomReset')}><IconReset /></button>
          </div>
        </section>
      </div>
    </div>
  );
}
