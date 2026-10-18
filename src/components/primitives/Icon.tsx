import { createElement } from 'react';
import { cx } from '../../lib/util';

type Part = [string, Record<string, string | number>];

const ICONS: Record<string, Part[]> = {
  search: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2' }]],
  play: [['path', { d: 'M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2a.8.8 0 0 0-1.2.7z', fill: 'currentColor', stroke: 'none' }]],
  pause: [['rect', { x: 7, y: 5, width: 3.5, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }], ['rect', { x: 13.5, y: 5, width: 3.5, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }]],
  doc: [['path', { d: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' }], ['path', { d: 'M14 3v5h5M9.5 13h6M9.5 17h4' }]],
  video: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }], ['path', { d: 'M10.5 9.5v5l4-2.5z', fill: 'currentColor' }]],
  steps: [['path', { d: 'M10 6.5h10M10 12h10M10 17.5h10' }], ['path', { d: 'M3.5 6.5l1.5 1.5 2.5-3' }], ['circle', { cx: 5.2, cy: 12, r: 1.6 }], ['circle', { cx: 5.2, cy: 17.5, r: 1.6 }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  expert: [['path', { d: 'M4.5 14v-2a7.5 7.5 0 0 1 15 0v2' }], ['rect', { x: 3, y: 13.5, width: 4, height: 6, rx: 1.6 }], ['rect', { x: 17, y: 13.5, width: 4, height: 6, rx: 1.6 }], ['path', { d: 'M19 19.5c0 1.2-1.2 2-3 2h-2.5' }]],
  arrow: [['path', { d: 'M7 17L17 7M9 7h8v8' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7.5V12l3 2' }]],
  grid: [['rect', { x: 4, y: 4, width: 7, height: 7, rx: 2 }], ['rect', { x: 13, y: 4, width: 7, height: 4, rx: 1.6 }], ['rect', { x: 13, y: 10, width: 7, height: 10, rx: 2 }], ['rect', { x: 4, y: 13, width: 7, height: 7, rx: 2 }]],
  enter: [['path', { d: 'M19 5v6a3 3 0 0 1-3 3H6' }], ['path', { d: 'M10 10l-4 4 4 4' }]],
  close: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  ready: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M8 12.4l2.8 2.8 5.4-5.6' }]],
  route: [['circle', { cx: 6, cy: 18, r: 2.2 }], ['circle', { cx: 18, cy: 6, r: 2.2 }], ['path', { d: 'M8.2 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.8' }]],
  chevron: [['path', { d: 'M9 6l6 6-6 6' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  history: [['path', { d: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3' }], ['path', { d: 'M4.5 4.8v3.7h3.7' }], ['path', { d: 'M12 8.2v4l2.7 1.7' }]],
  users: [['circle', { cx: 9, cy: 8.5, r: 3.2 }], ['path', { d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }], ['circle', { cx: 16.5, cy: 9.5, r: 2.6 }], ['path', { d: 'M15.5 14.2A4.6 4.6 0 0 1 20.5 19' }]],
  edit: [['path', { d: 'M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z' }], ['path', { d: 'M13.5 8.5l3 3' }]],
  undo: [['path', { d: 'M9 7L4.5 11.5 9 16' }], ['path', { d: 'M5 11.5h9a5 5 0 0 1 0 10h-3' }]],
  clip: [['path', { d: 'M20 11.5l-7.6 7.6a4.6 4.6 0 0 1-6.5-6.5l8-8a3.1 3.1 0 0 1 4.4 4.4l-8 8a1.5 1.5 0 0 1-2.2-2.2l7.2-7.2' }]],
  image: [['rect', { x: 4, y: 5, width: 16, height: 14, rx: 3 }], ['circle', { cx: 9, cy: 10, r: 1.6 }], ['path', { d: 'M5 17l5-4.5 3.5 3 2.5-2L20 17' }]],
  calendar: [['rect', { x: 4, y: 5, width: 16, height: 15, rx: 3 }], ['path', { d: 'M4 10h16M9 3v4M15 3v4' }]],
  home: [['path', { d: 'M4 10.6L12 4l8 6.6V19a1 1 0 0 1-1 1h-4.2v-5.6H9.2V20H5a1 1 0 0 1-1-1z' }]],
  inbox: [['path', { d: 'M4 13l2.3-6.9A1.6 1.6 0 0 1 7.8 5h8.4a1.6 1.6 0 0 1 1.5 1.1L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }], ['path', { d: 'M4 13h4.6a1 1 0 0 1 1 .8 2.5 2.5 0 0 0 4.8 0 1 1 0 0 1 1-.8H20' }]],
  trends: [['path', { d: 'M4 5v14h16' }], ['path', { d: 'M8 15l3.4-4.2 3 2.4L19 7.5' }]],
  chat: [['path', { d: 'M6.5 5h11A2.5 2.5 0 0 1 20 7.5v6a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5V16h-1A2.5 2.5 0 0 1 4 13.5v-6A2.5 2.5 0 0 1 6.5 5z' }], ['path', { d: 'M8.5 9.5h7M8.5 12.5h4.5' }]],
  book: [['path', { d: 'M12 6.6C10.3 5.4 8 5 4.5 5v13c3.5 0 5.8.4 7.5 1.6 1.7-1.2 4-1.6 7.5-1.6V5c-3.5 0-5.8.4-7.5 1.6z' }], ['path', { d: 'M12 6.6v13' }]],
};

export type IconName = keyof typeof ICONS;

interface IconProps { name: IconName | string; size?: number; strokeWidth?: number; label?: string; className?: string }

export function Icon({ name, size = 18, strokeWidth = 1.6, label, className }: IconProps) {
  const parts = ICONS[name] ?? ICONS.ready;
  return (
    <svg
      className={cx('rc-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
    >
      {parts.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
