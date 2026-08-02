// 水墨風 SVG 圖示系統
//
// 取代全 App 的彩色點陣 Emoji，改為一致的單色線條圖示。
// 線條風格刻意保留微微圓潤的筆觸感，與「墨色、朱砂、金箔、宣紙」定位一致。
// 每個圖示皆接受 `color` prop，預設不填色以便跟隨主題。
//
// 用法：
//   import Icon from '@/components/icons/Icon';
//   <Icon name="home" size={24} color={theme.gold} />

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';

const VIEW = 24;

export type IconName =
  | 'home' | 'scroll' | 'settings'
  | 'dice' | 'chess-board'
  | 'crystal-ball'
  | 'heart' | 'heart-filled'
  | 'share' | 'refresh' | 'trash' | 'undo' | 'check' | 'lock'
  | 'flame' | 'trophy' | 'chart' | 'lantern' | 'location' | 'star'
  | 'moon' | 'sun' | 'save' | 'download' | 'graduation'
  | 'warning' | 'folder' | 'lightbulb'
  | 'career' | 'wealth' | 'health' | 'study' | 'travel'
  | 'love'
  | 'fire';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 24, color = '#C9A96E' }: IconProps) {
  const s = size;
  return (
    <Svg
      width={s}
      height={s}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <IconPaths name={name} />
    </Svg>
  );
}

/** 回傳每個圖示的純 SVG 元素（不包含外層 Svg 包裝） */
function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    // ─── 導覽 ───
    case 'home':
      return (
        <>
          <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <Path d="M9 21V12h6v9" />
        </>
      );

    case 'scroll':
      return (
        <>
          <Path d="M5 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <Path d="M7 8h10" />
          <Path d="M7 12h10" />
          <Path d="M7 16h6" />
          <Path d="M17 17a2 2 0 0 1 2 2v0" />
        </>
      );

    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a1.998 1.998 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a1.998 1.998 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      );

    // ─── 模式 ───
    case 'dice':
      return (
        <>
          <Rect x="1" y="1" width="9" height="9" rx="2" />
          <Rect x="14" y="1" width="9" height="9" rx="2" />
          <Rect x="1" y="14" width="9" height="9" rx="2" />
          <Rect x="14" y="14" width="9" height="9" rx="2" />
          <Circle cx="5.5" cy="5.5" r="0.8" fill={undefined} />
          <Circle cx="18.5" cy="5.5" r="0.8" />
          <Circle cx="5.5" cy="18.5" r="0.8" />
          <Circle cx="18.5" cy="18.5" r="0.8" />
        </>
      );

    case 'chess-board':
      return (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="2" />
          <Line x1="3" y1="9" x2="21" y2="9" />
          <Line x1="3" y1="15" x2="21" y2="15" />
          <Line x1="9" y1="3" x2="9" y2="21" />
          <Line x1="15" y1="3" x2="15" y2="21" />
          <Circle cx="12" cy="6" r="1.2" />
          <Circle cx="6" cy="12" r="1.2" />
          <Circle cx="18" cy="12" r="1.2" />
          <Circle cx="12" cy="18" r="1.2" />
        </>
      );

    // ─── 占卜 ───
    case 'crystal-ball':
      return (
        <>
          <Path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V17h8v-2.3c1.8-1.3 3-3.4 3-5.7a7 7 0 0 0-7-7z" />
          <Line x1="8" y1="17" x2="16" y2="17" />
          <Path d="M9 17v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2" />
          <Path d="M12 6l.5 1.5H14l-1.2.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.2-.9h1.5z" />
        </>
      );

    // ─── 類別 ───
    case 'love':
      return (
        <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      );

    case 'career':
      return (
        <>
          <Path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </>
      );

    case 'wealth':
      return (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="6" x2="12" y2="18" />
          <Path d="M9 8.5h3a2 2 0 1 1 0 4h-3a2 2 0 1 0 0 4h3" />
        </>
      );

    case 'health':
      return (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="9" y1="12" x2="15" y2="12" />
          <Line x1="12" y1="9" x2="12" y2="15" />
        </>
      );

    case 'study':
      return (
        <>
          <Path d="M4 6h16v14H4V6z" />
          <Path d="M4 6l8-4 8 4" />
          <Line x1="9" y1="6" x2="9" y2="20" />
          <Path d="M4 6h16" />
        </>
      );

    case 'travel':
      return (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 2a10 10 0 0 1 0 20" />
          <Path d="M12 2a4 4 0 0 0 0 20" />
          <Line x1="2" y1="12" x2="22" y2="12" />
        </>
      );

    // ─── 動作 ───
    case 'heart':
      return (
        <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      );

    case 'heart-filled':
      return (
        <Path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={undefined}
        />
      );

    case 'share':
      return (
        <>
          <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <Polyline points="16 6 12 2 8 6" />
          <Line x1="12" y1="2" x2="12" y2="15" />
        </>
      );

    case 'refresh':
      return (
        <>
          <Path d="M23 4v6h-6" />
          <Path d="M1 20v-6h6" />
          <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <Path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </>
      );

    case 'trash':
      return (
        <>
          <Polyline points="3 6 5 6 21 6" />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <Line x1="10" y1="11" x2="10" y2="17" />
          <Line x1="14" y1="11" x2="14" y2="17" />
        </>
      );

    case 'undo':
      return (
        <>
          <Path d="M3 10h10a5 5 0 0 1 0 10H9" />
          <Polyline points="7 6 3 10 7 14" />
        </>
      );

    case 'check':
      return <Polyline points="20 6 9 17 4 12" />;

    case 'lock':
      return (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <Circle cx="12" cy="16" r="1" />
        </>
      );

    // ─── 狀態 ───
    case 'flame':
      return (
        <>
          <Path d="M12 23c-4-3-8-6.5-8-11a8 8 0 1 1 16 0c0 4.5-4 8-8 11z" />
          <Path d="M12 18a3 3 0 0 0 3-3c0-2-3-5-3-5s-3 3-3 5a3 3 0 0 0 3 3z" />
        </>
      );

    case 'trophy':
      return (
        <>
          <Path d="M6 9H3v4a3 3 0 0 0 3 3" />
          <Path d="M18 9h3v4a3 3 0 0 1-3 3" />
          <Path d="M6 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
          <Path d="M12 16v5" />
          <Line x1="8" y1="21" x2="16" y2="21" />
        </>
      );

    case 'chart':
      return (
        <>
          <Line x1="18" y1="20" x2="18" y2="10" />
          <Line x1="12" y1="20" x2="12" y2="4" />
          <Line x1="6" y1="20" x2="6" y2="14" />
        </>
      );

    case 'lantern':
      return (
        <>
          <Path d="M12 2 8 6h8l-4-4z" />
          <Path d="M8 6h8v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6z" />
          <Line x1="10" y1="12" x2="14" y2="12" />
          <Line x1="8" y1="20" x2="16" y2="20" />
        </>
      );

    case 'location':
      return (
        <>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
          <Circle cx="12" cy="10" r="3" />
        </>
      );

    case 'star':
      return (
        <Path d="M12 2l1.5 5.5L19 5l-3 4.5L22 10l-5 1.5 2 5-4-3.5-4 3.5 2-5L2 10l6-.5L5 5l5.5 2.5z" />
      );

    case 'moon':
      return <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;

    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="5" />
          <Line x1="12" y1="1" x2="12" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="23" />
          <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <Line x1="1" y1="12" x2="3" y2="12" />
          <Line x1="21" y1="12" x2="23" y2="12" />
          <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </>
      );

    case 'save':
      return (
        <>
          <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <Polyline points="17 21 17 13 7 13 7 21" />
          <Polyline points="7 3 7 8 15 8" />
        </>
      );

    case 'download':
      return (
        <>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <Polyline points="7 10 12 15 17 10" />
          <Line x1="12" y1="15" x2="12" y2="3" />
        </>
      );

    case 'graduation':
      return (
        <>
          <Path d="M22 10 12 3 2 10l10 7 10-7z" />
          <Path d="M6 12v5a6 6 0 0 0 12 0v-5" />
        </>
      );

    case 'warning':
      return (
        <>
          <Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Circle cx="12" cy="17" r="0.5" />
        </>
      );

    case 'folder':
      return (
        <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
      );

    case 'lightbulb':
      return (
        <>
          <Path d="M9.09 16.39V18h5.82v-1.61a5 5 0 1 0-5.82 0z" />
          <Line x1="10" y1="21" x2="14" y2="21" />
        </>
      );

    case 'fire':
      return (
        <>
          <Path d="M12 23c-4-3-8-6.5-8-11a8 8 0 1 1 16 0c0 4.5-4 8-8 11z" />
          <Path d="M12 18a3 3 0 0 0 3-3c0-2-3-5-3-5s-3 3-3 5a3 3 0 0 0 3 3z" />
        </>
      );

    default:
      return null;
  }
}
