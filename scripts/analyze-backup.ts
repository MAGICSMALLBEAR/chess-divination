// 備份資料分析 — 案例歷史整理 + 統計分析報告
//
// 用法（可吃多個備份檔，例如網頁一份＋手機一份）：
//   npx tsx scripts/analyze-backup.ts 網頁.json 手機.json > 報告.md
//
// 多檔合併語意與 App 雲端同步一致：依記錄 id 去重、先出現者優先、
// 按時間排序。每個檔的「新增筆數」會寫進報告，方便看出哪台裝置
// 有另一台沒有的案例。
//
// 統計口徑與 App 統計頁完全一致：直接引用 verification.ts 的函式，
// 不另起一套算法——否則報告與畫面數字對不上，反而製造困惑。
// 卦象衍生維度（體用／動爻／時令）同樣只算引擎 v2 以上的記錄。

/// <reference types="node" />
// TS 6 不再自動收錄 @types/node（Expo 的 process 型別來自 expo/types，
// 不是 node），但這支腳本要讀本地備份檔，得明確拉進 node 型別。

import fs from 'fs';
import {
  computeAccuracy, accuracyByCategory, accuracyByLevel, accuracyByMode,
  accuracyByBodyUse, accuracyByMovingLine, accuracyBySeason, bestCategory,
  medianVerifyDelay, pendingVerification, daysSince, isVerified,
  OUTCOME_LABELS,
} from '../src/services/verification';
import type { DivinationRecord } from '../src/services/storage';

const CATEGORY_LABELS: Record<string, string> = {
  marriage: '感情', wealth: '財運', career: '事業', health: '健康',
  study: '學業', travel: '出行', general: '綜合',
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function fmtMonth(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function clip(s: string | undefined, n: number): string {
  if (!s) return '—';
  const t = s.replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function cat(r: DivinationRecord): string {
  return CATEGORY_LABELS[r.questionCategory ?? ''] ?? r.questionCategory ?? '—';
}

function outcomeCell(r: DivinationRecord): string {
  const o = r.outcome;
  if (!o) return '未回填';
  const note = o.note ? `（${clip(o.note, 16)}）` : '';
  return `${OUTCOME_LABELS[o.status]}${note}`;
}

function pct(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`;
}

function table(headers: string[], rows: string[][]): string {
  const out = [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const row of rows) out.push(`| ${row.map(c => c.replace(/\|/g, '／')).join(' | ')} |`);
  return out.join('\n');
}

function breakdownTable(b: ReturnType<typeof accuracyByCategory>): string {
  if (b.length === 0) return '（尚無回填資料）';
  const rows = b.map(x => [
    x.label,
    String(x.stats.verified),
    pct(x.stats.rate),
    x.stats.verified < 5 ? '⚠ 樣本少' : '',
    `${x.stats.accurate} 應 / ${x.stats.partial} 半 / ${x.stats.inaccurate} 未`,
  ]);
  return table(['分組', '已驗', '應驗率', '樣本', '細項'], rows);
}

function main(): void {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error('用法: npx tsx scripts/analyze-backup.ts <備份檔.json> [更多備份檔.json...]');
    process.exit(1);
  }

  // 多檔合併：依 id 去重、先出現者優先（與 App 雲端同步 mergeHistories 一致）
  const perSource: { path: string; added: number }[] = [];
  const seen = new Set<string>();
  const records: DivinationRecord[] = [];
  for (const path of paths) {
    const backup = JSON.parse(fs.readFileSync(path, 'utf-8'));
    const list: unknown[] = backup?.data?.['@chess_divination_history'] ?? [];
    if (!Array.isArray(list)) {
      console.error(`${path}：備份檔裡找不到占卜歷史（@chess_divination_history）`);
      process.exit(1);
    }
    let added = 0;
    for (const item of list) {
      if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') continue;
      const id = (item as { id: string }).id;
      if (seen.has(id)) continue;
      seen.add(id);
      records.push(item as DivinationRecord);
      added++;
    }
    perSource.push({ path, added });
  }
  if (records.length === 0) {
    console.error('合併後沒有任何占卜記錄');
    process.exit(1);
  }
  records.sort((a, b) => a.timestamp - b.timestamp);

  const legacyCount = records.filter(r => (r.engineVersion ?? 1) < 2).length;
  const acc = computeAccuracy(records);
  const verified = records.filter(isVerified);
  const first = records[0].timestamp;
  const last = records[records.length - 1].timestamp;

  // ── 時間趨勢：按月應驗率、前半 vs 後半 ──
  const byMonth = new Map<string, typeof records>();
  for (const r of verified) {
    const m = fmtMonth(r.timestamp);
    byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
  }
  const monthRows = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, rs]) => {
      const s = computeAccuracy(rs);
      return [m, String(s.verified), pct(s.rate)];
    });

  const half = Math.floor(verified.length / 2);
  const early = computeAccuracy(verified.slice(0, half));
  const late = computeAccuracy(verified.slice(half));
  const improving = early.rate !== null && late.rate !== null
    ? late.rate - early.rate : null;

  // ── 吉凶校準：吉組（大吉／吉）vs 凶組（凶／小凶）──
  const isLucky = (r: DivinationRecord) =>
    r.poemLevel === '大吉' || r.poemLevel === '吉';
  const isUnlucky = (r: DivinationRecord) =>
    r.poemLevel === '凶' || r.poemLevel === '小凶';
  const lucky = computeAccuracy(verified.filter(isLucky));
  const unlucky = computeAccuracy(verified.filter(isUnlucky));

  // ── 失手回顧：未應驗的案例 ──
  const misses = verified.filter(r => r.outcome?.status === 'inaccurate');

  // ── 待回填 ──
  const pending = pendingVerification(records);

  const lines: string[] = [];
  lines.push('# 象棋占卜 — 案例統計分析報告');
  lines.push('');
  lines.push(`> 資料範圍：${fmtDate(first)} ~ ${fmtDate(last)}（共 ${records.length} 則）`);
  lines.push('');

  lines.push('## 一、總覽');
  lines.push('');
  lines.push(`- 總占卜數：${records.length}（引擎 v2 以上 ${records.length - legacyCount} 則；v1 舊卦法 ${legacyCount} 則，不進卦象維度統計）`);
  lines.push(`- 已回填：${acc.verified} 則 · 未回填：${acc.unverified} 則 · 回填率：${Math.round(acc.verified / records.length * 100)}%`);
  lines.push(`- 加權應驗率：${pct(acc.rate)}（應驗 1 分、部分 0.5 分、未驗 0 分）`);
  lines.push(`- 回填延遲中位數：${medianVerifyDelay(records) ?? '—'} 天（占卜後多久才回填）`);
  lines.push(`- 資料來源（多檔已依 id 去重，先出現者優先）：`);
  for (const s of perSource) {
    lines.push(`  - \`${s.path}\` 新增 ${s.added} 則`);
  }
  lines.push('');

  lines.push('## 二、案例歷史（依時間排序）');
  lines.push('');
  lines.push(table(
    ['日期', '類別', '問事', '籤題', '吉凶', '模式', '結果'],
    records.map(r => [
      fmtDate(r.timestamp),
      cat(r),
      clip(r.questionText, 12),
      `${r.poemTitle}${(r.engineVersion ?? 1) < 2 ? '（v1）' : ''}`,
      r.poemLevel,
      r.mode === 'draw' ? '抽棋' : '棋盤',
      outcomeCell(r),
    ]),
  ));
  lines.push('');

  lines.push('## 三、統計分析');
  lines.push('');
  lines.push('### 3.1 三態分佈');
  lines.push('');
  lines.push(`應驗 ${acc.accurate} · 部分應驗 ${acc.partial} · 未應驗 ${acc.inaccurate}（未回填 ${acc.unverified}）`);
  lines.push('');
  lines.push('### 3.2 依問事類別');
  lines.push('');
  lines.push(breakdownTable(accuracyByCategory(records)));
  lines.push('');
  lines.push('### 3.3 依吉凶等級（校準：斷語樂觀程度）');
  lines.push('');
  lines.push(breakdownTable(accuracyByLevel(records)));
  lines.push('');
  if (lucky.rate !== null && unlucky.rate !== null) {
    lines.push(`- 吉組（大吉＋吉，n=${lucky.verified}）：${pct(lucky.rate)}`);
    lines.push(`- 凶組（凶＋小凶，n=${unlucky.verified}）：${pct(unlucky.rate)}`);
    const gap = unlucky.rate - lucky.rate;
    lines.push(`- 落差：${gap > 0 ? `凶組反而準 ${gap} 個百分點` : gap < 0 ? `吉組準 ${-gap} 個百分點` : '無落差'}——${gap > 0 ? '斷言吉利的自信度可能過高，值得留意' : '斷吉較可靠'}`);
    lines.push('');
  }
  lines.push('### 3.4 依占卜模式');
  lines.push('');
  lines.push(breakdownTable(accuracyByMode(records)));
  lines.push('');
  lines.push('### 3.5 依體用生剋（僅引擎 v2 以上）');
  lines.push('');
  lines.push(breakdownTable(accuracyByBodyUse(records)));
  lines.push('');
  lines.push('### 3.6 依動爻位置（僅引擎 v2 以上）');
  lines.push('');
  lines.push(breakdownTable(accuracyByMovingLine(records)));
  lines.push('');
  lines.push('### 3.7 依起卦時令（僅引擎 v2 以上）');
  lines.push('');
  lines.push(breakdownTable(accuracyBySeason(records)));
  lines.push('');
  const best = bestCategory(records);
  lines.push('### 3.8 個人洞察');
  lines.push('');
  lines.push(best
    ? `你問「${best.label}」最準——${best.stats.verified} 則已驗，應驗率 ${pct(best.stats.rate)}。`
    : '（回填樣本不足，尚無洞察——單一類別需至少 5 則已驗）');
  lines.push('');
  lines.push('### 3.9 時間趨勢');
  lines.push('');
  if (monthRows.length > 0) {
    lines.push(table(['月份', '已驗', '應驗率'], monthRows));
    lines.push('');
  }
  lines.push(`- 前半段（${early.verified} 則）：${pct(early.rate)} · 後半段（${late.verified} 則）：${pct(late.rate)}`);
  if (improving !== null) {
    lines.push(`- ${improving > 0 ? `後半段高 ${improving} 個百分點——有進步` : improving < 0 ? `後半段低 ${-improving} 個百分點——近期退步，值得回顧失手案例` : '前後半段持平'}`);
  }
  lines.push('');

  lines.push('## 四、失手回顧（未應驗案例）');
  lines.push('');
  if (misses.length === 0) {
    lines.push('（沒有未應驗案例）');
  } else {
    lines.push(table(
      ['日期', '類別', '問事', '籤題', '吉凶', '回填備註'],
      misses.map(r => [
        fmtDate(r.timestamp),
        cat(r),
        clip(r.questionText, 14),
        r.poemTitle,
        r.poemLevel,
        clip(r.outcome?.note, 24),
      ]),
    ));
  }
  lines.push('');

  lines.push('## 五、待回填提醒（占卜已滿 14 天）');
  lines.push('');
  if (pending.length === 0) {
    lines.push('（沒有待回填的案例）');
  } else {
    lines.push(table(
      ['日期', '已過天數', '類別', '問事', '籤題'],
      pending.map(r => [
        fmtDate(r.timestamp),
        String(daysSince(r.timestamp)),
        cat(r),
        clip(r.questionText, 14),
        r.poemTitle,
      ]),
    ));
  }
  lines.push('');

  console.log(lines.join('\n'));
}

main();
