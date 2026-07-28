// 棋盤佈局模式狀態機 Hook

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { ChessPiece } from '@/data/pieces';
import { ALL_PIECES } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { selectPoem, generateDrawSummary } from '@/services/divination';
import { addHistory, recordFromDivination } from '@/services/storage';
import { playPlacePieceSound } from '@/services/sound';
import { hapticLight } from '@/services/haptics';
import { generatePositionSummary } from '@/services/position';

export interface PlacedPiece {
  piece: ChessPiece;
  col: number;
  row: number;
}

export type BoardStep = 'select-pieces' | 'place-pieces' | 'result';

export function useBoardDivination() {
  const router = useRouter();
  const [step, setStep] = useState<BoardStep>('select-pieces');
  const [placedPieces, setPlacedPieces] = useState<PlacedPiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<ChessPiece | null>(null);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [questionCategory, setQuestionCategory] = useState<string>('general');
  const [questionText, setQuestionText] = useState<string>('');

  const availablePieces = ALL_PIECES;
  const maxPieces = 3;

  // 選擇棋子
  const selectPiece = useCallback((piece: ChessPiece) => {
    if (placedPieces.length >= maxPieces) return;
    if (placedPieces.some(pp => pp.piece.id === piece.id)) return;
    setSelectedPiece(piece);
  }, [placedPieces]);

  // 放置棋子到棋盤
  const placePieceOnBoard = useCallback((col: number, row: number) => {
    if (!selectedPiece) return;
    if (placedPieces.some(pp => pp.col === col && pp.row === row)) return;

    setPlacedPieces(prev => [...prev, { piece: selectedPiece, col, row }]);
    setSelectedPiece(null);
    playPlacePieceSound();
    hapticLight();
  }, [selectedPiece, placedPieces]);

  // 移除棋子
  const removePieceFromBoard = useCallback((col: number, row: number) => {
    setPlacedPieces(prev => prev.filter(pp => !(pp.col === col && pp.row === row)));
  }, []);

  // 進行占卜解讀
  const interpret = useCallback(async (category?: string, text?: string) => {
    if (placedPieces.length === 0) return;
    const cat = category || questionCategory;
    const txt = text !== undefined ? text : questionText;
    if (category) setQuestionCategory(category);
    if (text !== undefined) setQuestionText(text);

    // 生成位置解讀
    const positions = placedPieces.map(pp => ({ col: pp.col, row: pp.row }));
    const positionSummary = generatePositionSummary(positions);

    // 使用棋子順序作為順序（依放置先後）
    const pieces = placedPieces.map(pp => pp.piece);
    const poem = selectPoem(pieces);
    setSelectedPoem(poem);

    // 儲存記錄
    const record = recordFromDivination(poem, pieces, 'board', cat, txt, positionSummary);
    const saved = await addHistory(record);
    setStep('result');

    router.push({
      pathname: '/reveal',
      params: {
        recordId: saved.id,
        mode: 'board',
      },
    });
  }, [placedPieces, questionCategory, router]);

  // 重置
  const reset = useCallback(() => {
    setStep('select-pieces');
    setPlacedPieces([]);
    setSelectedPiece(null);
    setSelectedPoem(null);
  }, []);

  return {
    step,
    placedPieces,
    selectedPiece,
    selectedPoem,
    availablePieces,
    maxPieces,
    questionCategory,
    setQuestionCategory,
    selectPiece,
    placePieceOnBoard,
    removePieceFromBoard,
    interpret,
    reset,
  };
}
