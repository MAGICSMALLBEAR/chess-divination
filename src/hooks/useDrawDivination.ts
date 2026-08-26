// 抽棋模式狀態機 Hook
// 管理整個抽棋流程的狀態轉換

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { ChessPiece } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { getPoemById } from '@/data/poems';
import type { HexagramResult } from '@/services/divination';
import { drawPieces, computeHexagram, generateDrawSummary } from '@/services/divination';
import { addHistory, recordFromDivination } from '@/services/storage';
import { notify } from '@/services/dialog';
import { t } from '@/services/i18n';
import { scheduleVerificationReminder } from '@/services/notifications';

export type DrawStep = 'select-count' | 'drawing' | 'result';

export function useDrawDivination() {
  const router = useRouter();
  const [step, setStep] = useState<DrawStep>('select-count');
  const [pieceCount, setPieceCount] = useState<1 | 2 | 3>(2);
  const [drawnPieces, setDrawnPieces] = useState<ChessPiece[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [hexagram, setHexagram] = useState<HexagramResult | null>(null);
  const [drawSummary, setDrawSummary] = useState('');
  const [questionCategory, setQuestionCategory] = useState<string>('general');
  const [questionText, setQuestionText] = useState<string>('');

  // 開始抽棋
  const startDrawing = useCallback((count: 1 | 2 | 3, category?: string, text?: string) => {
    setPieceCount(count);
    if (category) setQuestionCategory(category);
    if (text !== undefined) setQuestionText(text);
    setStep('drawing');

    // 執行抽棋
    const pieces = drawPieces(count);
    setDrawnPieces(pieces);

    // 起卦並選擇籤詩
    const hex = computeHexagram(pieces);
    setHexagram(hex);
    setSelectedPoem(getPoemById(hex.poemId));

    // 生成摘要
    const summary = generateDrawSummary(pieces);
    setDrawSummary(summary);
  }, []);

  // 重置（宣告在 goToResult 之前——其相依陣列會用到它）
  const reset = useCallback(() => {
    setStep('select-count');
    setDrawnPieces([]);
    setSelectedPoem(null);
    setHexagram(null);
    setDrawSummary('');
  }, []);

  // in-flight 防護：連點揭示會在 addHistory 的 read-modify-write
  // 交錯時互相覆蓋（一筆記錄遺失、reveal 頁找不到 recordId 卡死）
  const savingRef = useRef(false);

  // 儲存並前往結果頁
  const goToResult = useCallback(async () => {
    if (savingRef.current || !selectedPoem || drawnPieces.length === 0) return;
    savingRef.current = true;
    try {
      // 儲存到歷史記錄
      const record = recordFromDivination(
        selectedPoem,
        drawnPieces,
        'draw',
        questionCategory,
        questionText,
        undefined,
        hexagram
          ? {
              name: hexagram.name,
              index: hexagram.index,
              movingLine: hexagram.movingLine,
              hourBranch: hexagram.hourBranch,
            }
          : undefined,
      );
      const saved = await addHistory(record);
      void scheduleVerificationReminder(saved);
      setStep('result');

      // 導航到 reveal 頁面
      router.push({
        pathname: '/reveal',
        params: {
          recordId: saved.id,
          mode: 'draw',
        },
      });
      // 導航後重設：從 reveal 返回時回到選擇畫面，而不是卡在
      // 「正在為您解讀…」的死畫面
      reset();
    } catch (e) {
      // addHistory 寫入失敗（儲存空間滿、AsyncStorage 損毀）時，
      // 沒有這一段就是 unhandled rejection——setStep('result') 沒跑到，
      // 畫面永遠停在「正在為您解讀…」，使用者只能殺掉 App。
      // 講清楚發生什麼事，並退回選擇畫面讓他能再試一次。
      console.warn('占卜記錄儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveRecordFailed'));
      reset();
    } finally {
      savingRef.current = false;
    }
  }, [selectedPoem, drawnPieces, questionCategory, questionText, hexagram, router, reset]);

  return {
    step,
    pieceCount,
    drawnPieces,
    selectedPoem,
    hexagram,
    drawSummary,
    questionCategory,
    setQuestionCategory,
    questionText,
    startDrawing,
    goToResult,
    reset,
  };
}
