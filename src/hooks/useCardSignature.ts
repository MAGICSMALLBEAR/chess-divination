// 分享卡與閱讀報告的署名（P4）：揭曉頁、靈棋頁、收藏頁三處共用。
//
// 每次畫面取得焦點時重讀設定：收藏頁是分頁，使用者到設定頁改了名字或關掉署名再切回來，
// 只在掛載時讀的話印出來的還是舊名字（S74 首頁待回填卡片同一個坑）。
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { cardSignature, getSettings, type AppSettings } from '@/services/storage';

export interface CardSignature {
  /** 分享卡要印的名字；不印為 undefined */
  shareSignature: string | undefined;
  /** 給 ReportExportSheet：有名字才出現開關，初始值跟設定 */
  sheetProps: { signatureName: string | undefined; signByDefault: boolean };
  /** 匯出報告時，依確認框上的開關決定這一次要不要印 */
  reportSignature: (includeSignature: boolean) => string | undefined;
}

export function useCardSignature(): CardSignature {
  const [settings, setSettings] = useState<Pick<AppSettings, 'userName' | 'signCards'> | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    getSettings().then(s => { if (!cancelled) setSettings({ userName: s.userName, signCards: s.signCards }); });
    return () => { cancelled = true; };
  }, []));

  // 名字本身（不看開關）：確認框要能單次打開署名，即使預設是關的
  const name = settings ? cardSignature({ userName: settings.userName, signCards: true }) : undefined;
  return {
    shareSignature: settings ? cardSignature(settings) : undefined,
    sheetProps: { signatureName: name, signByDefault: settings?.signCards !== false },
    reportSignature: include => (include ? name : undefined),
  };
}
