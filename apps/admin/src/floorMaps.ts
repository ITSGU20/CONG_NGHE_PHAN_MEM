import type { FloorId } from '@ddl/shared';
import b1 from '../../../packages/shared/assets/floors/floor-b1.png';
import f0 from '../../../packages/shared/assets/floors/floor-0.png';
import f1 from '../../../packages/shared/assets/floors/floor-1.png';
import f2 from '../../../packages/shared/assets/floors/floor-2.png';
import f3 from '../../../packages/shared/assets/floors/floor-3.png';
import f4 from '../../../packages/shared/assets/floors/floor-4.png';

export const FLOOR_IMG: Record<FloorId, string> = { [-1]: b1, 0: f0, 1: f1, 2: f2, 3: f3, 4: f4 };
