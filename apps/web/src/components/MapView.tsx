import { floorOf, resolveContent, type FloorId, type Poi } from '@ddl/shared';
import { useApp } from '../App';
import { FLOOR_IMG } from '../floorMaps';

interface Props {
  floor: FloorId;
  pois: Poi[];
  heard: Set<string>;
  hoverId: string | null;
  zoom: number;
  onHover: (id: string | null) => void;
  onPick: (poi: Poi) => void;
}

export default function MapView({
  floor,
  pois,
  heard,
  hoverId,
  zoom,
  onHover,
  onPick,
}: Props) {
  const { lang } = useApp();

  return (
    <div className="map" style={{ ['--z' as string]: zoom }}>
      <img className="mapart" src={FLOOR_IMG[floor]} alt="" draggable={false} />
      {pois
        .filter((p) => floorOf(p) === floor)
        .map((p) => {
          const r = resolveContent(p.published, lang);
          const isHover = hoverId === p.id;
          return (
            <button
              key={p.id}
              className={
                'pin' +
                (heard.has(p.id) ? ' heard' : '') +
                (isHover ? ' hover' : '')
              }
              style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}
              onClick={() => onPick(p)}
              onMouseEnter={() => onHover(p.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(p.id)}
              onBlur={() => onHover(null)}
              aria-label={r.content?.name || `${p.number}`}
            >
              {p.number}
              {r.content?.name && (
                <span className="pin-tooltip">{r.content.name}</span>
              )}
            </button>
          );
        })}
    </div>
  );
}