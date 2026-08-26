// 棋盤佈局模式狀態機 Hook

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { ChessPiece } from '@/data/pieces';
import { ALL_PIECES } from '@/data/pieces';
import type { Poem } from '@/data/poems';
import { getPoemById } from '@/data/poems';
import { computeHexagram } from '@/services/divination';
import { addHistory, recordFromDivination } from '@/services/storage';
import { notify } from '@/services/dialog';
import { t } from '@/services/i18n';
import { playPlacePieceSound } from '@/services/sound';
import { hapticLight } from '@/services/haptics';
import { scheduleVerificationReminder } from '@/services/notifications';
import { generatePositionSummaryDeep } from '@/services/position';
import { BOARD } from '@/constants/theme';
import type { SpreadId } from '@/services/spreads';
import { spreadContextReading, spreadReadingPrefix, spreadRoleReading } from '@/services/spreads';

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
  const [allowRepeatedPieces, setAllowRepeatedPieces] = useState(false);

  const availablePieces = ALL_PIECES;
  const maxPieces = 3;

  // 選擇棋子
  const selectPiece = useCallback((piece: ChessPiece) => {
    if (placedPieces.length >= maxPieces) return;
    if (!allowRepeatedPieces && placedPieces.some(pp => pp.piece.id === piece.id)) return;
    setSelectedPiece(piece);
  }, [placedPieces, allowRepeatedPieces]);

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

  // 重置（宣告在 interpret 之前——interpret 的相依陣列會用到它）
  const reset = useCallback(() => {
    setStep('select-pieces');
    setPlacedPieces([]);
    setSelectedPiece(null);
    setSelectedPoem(null);
  }, []);

  // in-flight 防護：連點「解讀」會在 addHistory 的 read-modify-write
  // 交錯時互相覆蓋（一筆記錄遺失、reveal 頁找不到 recordId 卡死）
  const interpretingRef = useRef(false);

  // 進行占卜解讀
  const interpret = useCallback(async (
    category?: string,
    text?: string,
    spreadId: SpreadId = 'free',
    spreadContext: { optionA?: string; optionB?: string } = {},
  ) => {
    if (interpretingRef.current || placedPieces.length === 0) return;
    interpretingRef.current = true;
    try {
      const cat = category || questionCategory;
      const txt = text !== undefined ? text : questionText;
      if (category) setQuestionCategory(category);
      if (text !== undefined) setQuestionText(text);

      // 生成深度位置解讀（含卦氣五行與棋盤方位）
      const placements = placedPieces.map(pp => ({
        col: pp.col, row: pp.row,
        guaElement: pp.piece.guaElement,
        direction: pp.piece.direction,
        pieceName: pp.piece.displayChar,
      }));
      const positionSummary = spreadReadingPrefix(spreadId)
        + spreadContextReading(spreadId, spreadContext)
        + spreadRoleReading(spreadId, placedPieces.map(({ piece }) => ({
          pieceName: piece.displayChar,
          meaning: piece.meaning,
        })))
        + generatePositionSummaryDeep(placements);

      // 使用棋子順序作為順序（依放置先後）
      const pieces = placedPieces.map(pp => pp.piece);

      // 擺位進入起卦：各棋子的格位數總和參與動爻計算，
      // 使「棋放在哪裡」真正影響卦象，而非僅產生一段文字敘述。
      const positionSum = placedPieces.reduce(
        (sum, pp) => sum + pp.col + pp.row * BOARD.cols,
        0,
      );

      const hex = computeHexagram(pieces, { extra: positionSum });
      const poem = getPoemById(hex.poemId);
      setSelectedPoem(poem);

      // 儲存記錄
      const record = recordFromDivination(
        poem, pieces, 'board', cat, txt, positionSummary,
        {
          name: hex.name,
          index: hex.index,
          movingLine: hex.movingLine,
          hourBranch: hex.hourBranch,
        },
        spreadId,
      );
      const saved = await addHistory(record);
      void scheduleVerificationReminder(saved);
      setStep('result');

      router.push({
        pathname: '/reveal',
        params: {
          recordId: saved.id,
          mode: 'board',
        },
      });
      // 導航後清空棋盤：從 reveal 返回時是全新佈局，不會把同一佈局
      // 再解讀一次而製造重複記錄
      reset();
    } catch (e) {
      // 與抽棋模式同理：addHistory 失敗時沒有 catch 就是 unhandled
      // rejection，畫面停在解讀中。這裡不 reset 棋盤——使用者辛苦擺的
      // 佈局不該因為儲存失敗而被清掉，退回 'place-pieces' 讓他直接重按解讀
      console.warn('棋盤占卜記錄儲存失敗:', e);
      notify(t('error.saveFailed'), t('error.saveRecordFailed'));
      setStep('place-pieces');
    } finally {
      interpretingRef.current = false;
    }
    // questionText 亦於內部讀取，未列入相依會在未帶參數呼叫時取到過時值
  }, [placedPieces, questionCategory, questionText, router, reset]);

  return {
    step,
    placedPieces,
    selectedPiece,
    selectedPoem,
    availablePieces,
    maxPieces,
    questionCategory,
    allowRepeatedPieces,
    setAllowRepeatedPieces,
    setQuestionCategory,
    selectPiece,
    placePieceOnBoard,
    removePieceFromBoard,
    interpret,
    reset,
  };
}
