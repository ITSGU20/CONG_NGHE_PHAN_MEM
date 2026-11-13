import { resolveContent, track, usePlayer, type Poi } from '@ddl/shared';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App';
import Header from '../components/Header';
import { IconBack, IconMap, IconNext, IconPause, IconPlay } from '../components/icons';
import { useVoicesReady, webTts } from '../tts';

const isUrl = (s?: string) => !!s && (/^(https?:)?\/\//.test(s) || s.startsWith('/') || s.startsWith('data:'));
const wellFormedId = (s?: string) => !!s && /^(poi-\d+|[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(s);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** UC3 – Nghe thuyết minh (đọc nội dung thành tiếng). Cũng là trang đích của mã QR (UC5). */
export default function PoiPage() {
  const { id } = useParams();
  const { lang, pois, loaded, loadError, reload, tr } = useApp();
  const nav = useNavigate();
  const how = (useLocation().state as { how?: string } | null)?.how;
  const poi = pois.find((p) => p.id === id);

  // UC5: vào thẳng bằng đường dẫn trong mã QR (không đi qua bản đồ/danh sách/nút "tiếp theo") => ghi poi_open (cách mở: QR)
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!poi || tracked.current === poi.id) return;
    tracked.current = poi.id;
    if (!how) track('poi_open', { poiId: poi.id, how: 'qr' });
  }, [poi?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!poi) {
    return (
      <div className="page">
        <Header />
        <main className="center">
          {!loaded ? (
            <p>{tr('loading')}</p>
          ) : loadError ? (
            <>
              <p>{tr('loadError')}</p>
              <button className="btn primary" onClick={reload}>{tr('retry')}</button>
            </>
          ) : (
           <p>{wellFormedId(id) ? tr('notPublished') : tr('invalidCode')}</p>
          )}
          <button className="btn" onClick={() => nav('/map')}>{tr('backToMap')}</button>
        </main>
      </div>
    );
  }
  // key có ngôn ngữ: đổi ngôn ngữ giữa chừng thì dừng đọc và hiện nút phát lại bằng ngôn ngữ mới (UC1 A1)
  return <PoiView key={`${poi.id}:${lang}`} poi={poi} />;
}

function PoiView({ poi }: { poi: Poi }) {
  const { lang, pois, heard, markHeard, tr } = useApp();
  const nav = useNavigate();
  useVoicesReady();

  const r = resolveContent(poi.published, lang);
  const textLang = r.textLang ?? lang;
  const paragraphs = (r.content?.narration ?? '').split(/\n\s*\n/).filter((p) => p.trim());
  const player = usePlayer({ poiId: poi.id, lang: textLang, selectedLang: lang, paragraphs, engine: webTts, onListenValid: () => markHeard(poi.id) });
  const [imgIdx, setImgIdx] = useState(0);

  const images = (poi.published?.images ?? []).filter(isUrl);
  const cover = poi.published?.images[0];
  const shown = images[imgIdx] ?? cover;
  const altOf = (src?: string) => (src && r.content?.captions?.[src]) || r.content?.name || '';
  const next = pois[pois.findIndex((p) => p.id === poi.id) + 1];
  const typeLabel = { outdoor: tr('typeOutdoor'), indoor: tr('typeIndoor'), mixed: tr('typeMixed') }[poi.type];

  return (
    <div className="page poipage">
      <Header />
      <article className="poi">
        <div className="poi-actions">
          <button className="btn glass" onClick={() => nav('/map')}><IconBack size={18} /> {tr('backToMap')}</button>
          <button className="btn glass icononly" onClick={() => nav('/map')} aria-label={tr('navMap')}><IconMap size={18} /></button>
        </div>

        <div className="poi-grid">
          <div className="poi-left">
            <div className="cover">
              {isUrl(shown) ? <img src={shown} alt={altOf(shown)} /> : <span className="cover-num">{poi.number}</span>}
              <span className="badge">{tr('point')} {poi.number}</span>
            </div>
            {images.length > 1 && (
              <div className="gallery" role="list" aria-label={tr('gallery')}>
                {images.map((src, i) => (
                  <button key={src + i} role="listitem" className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} aria-label={altOf(src)}>
                    <img src={src} alt={altOf(src)} />
                  </button>
                ))}
              </div>
            )}

            <div className="playercard">
              <button className="playbtn" onClick={player.toggle} disabled={!player.supported || paragraphs.length === 0}>
                {player.playing ? <IconPause size={22} /> : <IconPlay size={22} />}
              </button>
              <span className="playlabel">{player.playing ? tr('pause') : tr('play')}</span>
              <div
                className="track"
                onClick={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  player.seek((e.clientX - b.left) / b.width);
                }}
              >
                <i style={{ width: `${player.total ? (player.position / player.total) * 100 : 0}%` }} />
                <b style={{ left: `${player.total ? (player.position / player.total) * 100 : 0}%` }} />
              </div>
              <span className="time">{mmss(player.position)} / {mmss(player.total)}</span>
              <span className="caption">{tr('narrationLabel')}</span>
            </div>
            {!player.supported && <p className="notice">{tr('noTts')}</p>}
            {player.supported && !player.hasVoice && <p className="notice">{tr('noVoice')}</p>}
          </div>

          <div className="poi-right">
            <h1>{r.content?.name}</h1>
            <p className="subtitle">{r.content?.description}</p>
            <div className="chips">
              <span className="chip">{typeLabel}</span>
              {poi.wheelchair && <span className="chip">{tr('wheelchair')}</span>}
              {heard.has(poi.id) && <span className="chip ok">✓ {tr('heard')}</span>}
            </div>
            {r.usedFallback && <p className="notice">{tr('fallback')}</p>}

            <div className="narration">
              {paragraphs.map((p, i) => (
                <p key={i} className={player.playing && i === player.active ? 'active' : ''}>{p}</p>
              ))}
            </div>

            <div className="poi-foot">
              <span />
              {next ? (
                <button className="linkbtn" onClick={() => nav(`/poi/${next.id}`, { state: { how: 'next' } })}>
                  {tr('nextPoint')} <IconNext size={18} />
                </button>
              ) : <span />}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
