// 觸覺回饋服務 - expo-haptics
// 簡化版：Web fallback 使用 navigator.vibrate

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticEnabled(on: boolean) {
  enabled = on;
}

export function isHapticEnabled(): boolean {
  return enabled;
}

async function doHaptic(style: Haptics.ImpactFeedbackStyle) {
  if (!enabled) return;
  try {
    if (Platform.OS === 'web') {
      // Web fallback: vibration API
      if (navigator.vibrate) {
        navigator.vibrate(style === 'light' ? 10 : style === 'heavy' ? 30 : 20);
      }
    } else {
      await Haptics.impactAsync(style);
    }
  } catch {
    // Silently fail
  }
}

export function hapticLight() {
  return doHaptic(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium() {
  return doHaptic(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticHeavy() {
  return doHaptic(Haptics.ImpactFeedbackStyle.Heavy);
}

export function hapticSuccess() {
  if (!enabled) return;
  try {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {}
}
