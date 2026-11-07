import type { Poi } from '@ddl/shared';
import PalaceMapArt from './PalaceMapArt';

interface Props {
  pois: Poi[];
  heard: Set<string>;
  hoverId: string | null;
  zoom: number;
  onHover: (id: string | null) => void;
  onPick: (poi: Poi) => void;
}

/** Bản đồ tĩnh: mỗi điểm là một con số đặt theo % trên ảnh (mapX, mapY) */
export default function MapView({ pois, heard, hoverId, zoom, onHover, onPick }: Props) {
  return (
    <div className="map" style={{ ['--z' as string]: zoom }}>
      <PalaceMapArt />
      {pois.map((p) => (
        <button
          key={p.id}
          className={'pin' + (heard.has(p.id) ? ' heard' : '') + (hoverId === p.id ? ' hover' : '')}
          style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}
          onClick={() => onPick(p)}
          onMouseEnter={() => onHover(p.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(p.id)}
          onBlur={() => onHover(null)}
          aria-label={`${p.number}`}
        >
          {p.number}
        </button>
      ))}
    </div>
  );
}
