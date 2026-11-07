import type { PoiType } from '@ddl/shared';
import type { ReactNode } from 'react';

const Svg = ({ size = 20, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const IconGlobe = ({ size }: { size?: number }) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></Svg>
);
export const IconMap = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" /></Svg>
);
export const IconPlay = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M8 5v14l11-7L8 5Z" fill="currentColor" /></Svg>
);
export const IconPause = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M8 5v14M16 5v14" strokeWidth="3" /></Svg>
);
export const IconBack = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
);
export const IconNext = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const IconPlus = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconMinus = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M5 12h14" /></Svg>
);
export const IconReset = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></Svg>
);

/** Biểu tượng theo loại điểm: ngoài trời (cổng), trong nhà (cửa), nhà/ngoài trời (nhà) */
export function TypeIcon({ type, size }: { type: PoiType; size?: number }) {
  if (type === 'outdoor') return <Svg size={size}><path d="M5 21V8a7 7 0 0 1 14 0v13M5 21h4v-8h6v8h4" /></Svg>;
  if (type === 'indoor') return <Svg size={size}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 21v-6h6v6M12 8h.01" /></Svg>;
  return <Svg size={size}><path d="M3 11 12 3l9 8M5 10v11h14V10M10 21v-6h4v6" /></Svg>;
}
