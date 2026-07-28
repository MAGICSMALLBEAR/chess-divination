// 偵測 reduced motion 偏好
import { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      } catch {}
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
      const sub = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        setReduced,
      );
      return () => sub.remove();
    }
  }, []);

  return reduced;
}
