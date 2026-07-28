// 動畫速度 Hook
// 讀取設定中的動畫速度並提供倍率

import { useState, useEffect } from 'react';
import { getSettings } from '@/services/storage';

type Speed = 'slow' | 'normal' | 'fast';

const SPEED_MULTIPLIERS: Record<Speed, number> = {
  slow: 2.0,
  normal: 1.0,
  fast: 0.5,
};

export function useAnimationSpeed(): number {
  const [multiplier, setMultiplier] = useState(1.0);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setMultiplier(SPEED_MULTIPLIERS[settings.drawAnimationSpeed] || 1.0);
      } catch {}
    })();
  }, []);

  return multiplier;
}
