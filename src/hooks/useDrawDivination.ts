// 抽棋模式狀態機 Hook
// 管理整個抽棋流程的狀態轉換

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { ChessPiece } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { drawPiecesMixed, selectPoem, generateDrawSummary } from '@/services/divination';
import { addHistory, recordFromDivination } from '@/services/storage';

export type DrawStep = 'select-count' | 'drawing' | 'result';

export function useDrawDivination() {
  const router = useRouter();
  const [step, setStep] = useState<DrawStep>('select-count');
  const [pieceCount, setPieceCount] = useState<1 | 2 | 3>(2);
  const [drawnPieces, setDrawnPieces] = useState<ChessPiece[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
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
    const pieces = drawPiecesMixed(count);
    setDrawnPieces(pieces);

    // 選擇籤詩
    const poem = selectPoem(pieces);
    setSelectedPoem(poem);

    // 生成摘要
    const summary = generateDrawSummary(pieces);
    setDrawSummary(summary);
  }, []);

  // 儲存並前往結果頁
  const goToResult = useCallback(async () => {
    if (!selectedPoem || drawnPieces.length === 0) return;

    // 儲存到歷史記錄
    const record = recordFromDivination(
      selectedPoem,
      drawnPieces,
      'draw',
      questionCategory,
      questionText,
    );
    const saved = await addHistory(record);
    setStep('result');

    // 導航到 reveal 頁面
    router.push({
      pathname: '/reveal',
      params: {
        recordId: saved.id,
        mode: 'draw',
      },
    });
  }, [selectedPoem, drawnPieces, questionCategory, router]);

  // 重置
  const reset = useCallback(() => {
    setStep('select-count');
    setDrawnPieces([]);
    setSelectedPoem(null);
    setDrawSummary('');
  }, []);

  return {
    step,
    pieceCount,
    drawnPieces,
    selectedPoem,
    drawSummary,
    questionCategory,
    setQuestionCategory,
    questionText,
    startDrawing,
    goToResult,
    reset,
  };
}
