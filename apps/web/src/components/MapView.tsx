import { floorOf, type FloorId, type Poi } from '@ddl/shared';
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

export default function MapView({ floor, pois, heard, hoverId, zoom, onHover, onPick }: Props) {
  return (
    <div className="map" style={{ ['--z' as string]: zoom }}>
      <img className="mapart" src={FLOOR_IMG[floor]} alt="" draggable={false} />
      {pois.filter((p) => floorOf(p) === floor).map((p) => (
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
