// 原生端書法字體載入 Hook（web 版見 useFontLoad.web.ts）
//
// 載入子集化字型 assets/fonts/NotoSerifTC-400.ttf——
// 收錄 src 全部非 ASCII 字元（TC 主體＋JP 新字體補字），約 1.2MB。
// 產生方式見 scripts/subset-font.py；新字串用到新字元時
// fontSubset.test.ts 會紅，重跑腳本即可。
//
// 載入失敗不阻塞渲染：系統後備字體仍可正常閱讀。

import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export function useFontLoad(): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Font.loadAsync({
      NotoSerifTC: require('../../assets/fonts/NotoSerifTC-400.ttf'),
    }).finally(() => {
      // 成功與失敗都放行：loaded 代表「可以渲染」，失敗時用系統後備
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  return { loaded };
}
