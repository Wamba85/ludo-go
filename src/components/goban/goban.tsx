/**
 * Componente principale "Goban" che compone board, toolbar e move‑tree.
 *
 * ‑ Gestisce solo *stato UI* (toggle libertà/coordinate) – tutta la logica di
 *   gioco è delegata a `useGobanState`.
 * ‑ Calcola on‑the‑fly i flag di disabilitazione per i pulsanti di navigazione
 *   così la Toolbar rimane puramente presentazionale.
 */

'use client';
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import GobanBoard from './goban-board';
import MoveTree from './move-tree';
import Toolbar from './toolbar';
import { AfterPlayCtx, Setup, useGobanState } from '@/hooks/use-goban-state';
import type { Label, MoveNode } from '@/types/goban';
import { CELL_SIZE, MARGIN } from '@/utils/constants';
import { exportMoveTreeToSgf, defaultMeta } from '@/lib/sgf/moveNode-adapter';
import type { GoMeta, Coord } from '@/lib/sgf/go-semantic';
import { Card, CardContent } from '@/components/ui/card';
// (useEffect already imported above)

export type BoardClickCtx = {
  getLabels: () => Label[];
  setLabels: (updater: (labels: Label[]) => Label[]) => void;
  currentNode: MoveNode;
};

interface GobanProps {
  sgfMoves: string;
  BOARD_SIZE?: number;
  showMoveTree?: boolean;
  exerciseOptions?: {
    setup?: Setup;
    onAfterPlay?: (ctx: AfterPlayCtx) => void;
  };
  /** Optional: intercept board clicks. Return true to stop default handling */
  onBoardClick?: (r: number, c: number, ctx?: BoardClickCtx) => boolean | void;
  /** Optional labels overlay to render */
  labels?: Label[];
  /** Notify parent when parsed meta changes (useful to import labels/setup) */
  onMetaChange?: (meta: GoMeta) => void;
  /** Notify parent when SGF is loaded from internal toolbar */
  onSgfTextChange?: (sgf: string) => void;
  /** Visualizza solo la board, senza toolbar né colonna destra */
  boardOnly?: boolean;
  /** SGF remoto da caricare automaticamente alla prima render */
  preloadSgfUrl?: string;
  /** Sequenza guidata: valida le mosse utente e gioca automaticamente l'avversario */
  guidedSequence?: {
    autoPlayOpponent?: boolean;
    userColor?: 1 | 2;
    onWrongMove?: (info: {
      expected: { row: number; col: number; player: 1 | 2 };
      played: { row: number; col: number; player: 1 | 2 };
    }) => void;
    onAdvanceStep?: (playedMoves: number, totalMoves: number) => void;
    onComplete?: () => void;
  };
  /** Autoplay SGF: se la mossa dell'utente e' nel tree, gioca la risposta */
  autoplay?: boolean;
  /** Loop automatico della linea principale SGF */
  loopPlayback?: {
    enabled?: boolean;
    intervalMs?: number;
  };
}

export default function Goban({
  sgfMoves,
  BOARD_SIZE = 19,
  showMoveTree = true,
  exerciseOptions,
  onBoardClick,
  labels,
  onMetaChange,
  onSgfTextChange,
  boardOnly = false,
  preloadSgfUrl,
  guidedSequence,
  autoplay = false,
  loopPlayback,
}: GobanProps) {
  const [sgfText, setSgfText] = useState(sgfMoves); // ← nuovo stato locale
  const state = useGobanState(sgfText, BOARD_SIZE, exerciseOptions); // ← usa sgfText
  const [showLiberties, setShowLiberties] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const loopPlaybackEnabled = loopPlayback?.enabled ?? false;
  const loopPlaybackIntervalMs = Math.max(100, loopPlayback?.intervalMs ?? 800);
  const isInteractionLocked = loopPlaybackEnabled;
  const MAX_TREE_NODES = 1200;
  const isTreeTooLarge = useMemo(() => {
    let count = 0;
    const stack = [...state.root.children];
    while (stack.length) {
      const n = stack.pop()!;
      count++;
      if (count > MAX_TREE_NODES) return true;
      for (let i = 0; i < n.children.length; i++) stack.push(n.children[i]);
    }
    return false;
  }, [state.root]);

  // ↓↓↓ AGGIUNTA: due azioni SGF
  const applySgfText = (text: string) => {
    setSgfText((prev) => (prev === text ? prev : text));
  };

  const handleOpenSgf = async (f: File) => {
    const text = await f.text();
    onSgfTextChange?.(text);
    applySgfText(text); // ← niente replaceTree
  };

  const handleExportSgf = () => {
    // Base meta
    const base = state.meta ?? defaultMeta(BOARD_SIZE);
    // Merge: meta.setup (se presente) + setup applicato (editor o da SGF)
    const editorStones =
      exerciseOptions?.setup?.stones ?? state.appliedSetup?.stones ?? [];
    const AB_editor = editorStones
      .filter((s) => s.color === 1)
      .map((s) => ({ x: s.c, y: s.r }));
    const AW_editor = editorStones
      .filter((s) => s.color === 2)
      .map((s) => ({ x: s.c, y: s.r }));
    const baseSetup = base.setup ?? {};
    const AB_base: Coord[] = baseSetup.AB ?? [];
    const AW_base: Coord[] = baseSetup.AW ?? [];
    const AB: Coord[] = [...AB_base, ...AB_editor];
    const AW: Coord[] = [...AW_base, ...AW_editor];
    const metaSetupMerged: GoMeta =
      AB.length || AW.length
        ? { ...base, setup: { ...base.setup, AB, AW } }
        : base;

    const sgf = exportMoveTreeToSgf(metaSetupMerged, state.root);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([sgf], { type: 'text/plain;charset=utf-8' }),
    );
    a.download = 'game.sgf';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* flag per disabilitare i pulsanti << < > >> */
  const disableBack = isInteractionLocked || state.currentNode === state.root;
  const disableForward =
    isInteractionLocked || state.currentNode.children.length === 0;

  // Propagate meta changes to parent (e.g., when opening SGF from toolbar)
  // Use a ref to avoid firing the effect when the callback identity changes.
  const onMetaChangeRef = useRef<typeof onMetaChange>(undefined);
  useEffect(() => {
    onMetaChangeRef.current = onMetaChange;
  }, [onMetaChange]);
  useEffect(() => {
    onMetaChangeRef.current?.(state.meta);
  }, [state.meta]);

  // Aggiorna SGF se la prop sgfMoves cambia
  useEffect(() => {
    applySgfText(sgfMoves);
  }, [sgfMoves]);

  // Pre-carica SGF remoto se richiesto
  useEffect(() => {
    if (!preloadSgfUrl) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(preloadSgfUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        if (!cancelled) applySgfText(text);
      } catch (err) {
        console.error(
          `[Goban] Impossibile caricare SGF da ${preloadSgfUrl}`,
          err,
        );
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preloadSgfUrl]);

  useEffect(() => {
    if (!autoplay) return;
    if (!sgfText.trim() && !preloadSgfUrl) {
      console.warn('[Goban] autoplay abilitato senza SGF caricato.');
    }
  }, [autoplay, sgfText, preloadSgfUrl]);

  // Limit board size to the viewport height, with a minimum readable size.
  const boardBoxRef = useRef<HTMLDivElement>(null);
  const [maxBoardWidth, setMaxBoardWidth] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    const recompute = () => {
      const el = boardBoxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const padding = 16; // bottom safety margin
      const avail = Math.max(120, Math.floor(vh - rect.top - padding));
      const minCellSize =
        BOARD_SIZE <= 9 ? CELL_SIZE : Math.round(CELL_SIZE * 0.75);
      const minBoardWidth = Math.round(
        (BOARD_SIZE - 1) * minCellSize + MARGIN * 2,
      );
      setMaxBoardWidth(Math.max(minBoardWidth, avail));
    };
    const raf = requestAnimationFrame(recompute);
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, [BOARD_SIZE]);

  const rightColumnVisible = !boardOnly;
  const { root, setCurrentNode } = state;

  const loopSteps = useMemo<MoveNode[]>(() => {
    const moves: MoveNode[] = [];
    let node = root.children[0];
    while (node) {
      if (node.player === 1 || node.player === 2) {
        moves.push(node);
      }
      node = node.children[0];
    }
    return moves;
  }, [root]);

  const loopTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (loopTimerRef.current !== null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (!loopPlaybackEnabled) return;
    if (loopSteps.length === 0) {
      setCurrentNode(root);
      return;
    }

    let stepIndex = -1;
    setCurrentNode(root);

    loopTimerRef.current = window.setInterval(() => {
      if (loopSteps.length === 0) {
        stepIndex = -1;
        setCurrentNode(root);
        return;
      }
      if (stepIndex < 0) {
        stepIndex = 0;
        setCurrentNode(loopSteps[0]);
        return;
      }
      if (stepIndex >= loopSteps.length - 1) {
        stepIndex = -1;
        setCurrentNode(root);
        return;
      }
      stepIndex += 1;
      setCurrentNode(loopSteps[stepIndex]);
    }, loopPlaybackIntervalMs);

    return () => {
      if (loopTimerRef.current !== null) {
        window.clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, [
    loopPlaybackEnabled,
    loopPlaybackIntervalMs,
    loopSteps,
    root,
    setCurrentNode,
  ]);

  type SequenceStep = { node: MoveNode };
  const sequenceSteps = useMemo<SequenceStep[]>(() => {
    if (!guidedSequence) return [];
    const moves: SequenceStep[] = [];
    let node = root.children[0];
    while (node) {
      if (
        node.row >= 0 &&
        node.col >= 0 &&
        (node.player === 1 || node.player === 2)
      ) {
        moves.push({ node });
      }
      node = node.children[0];
    }
    return moves;
  }, [guidedSequence, root]);

  const [, forceSequenceCursorUpdate] = useState(0);
  const sequenceCursorRef = useRef(0);
  const bumpCursorIfChanged = useCallback(
    (value: number) => {
      if (sequenceCursorRef.current !== value) {
        sequenceCursorRef.current = value;
        forceSequenceCursorUpdate((prev) => prev + 1);
      }
    },
    [forceSequenceCursorUpdate],
  );
  const [sequenceUserColor, setSequenceUserColor] = useState<1 | 2 | null>(
    null,
  );
  const sequenceUserColorRef = useRef<1 | 2 | null>(null);

  useEffect(() => {
    if (!guidedSequence) {
      bumpCursorIfChanged(0);
      setSequenceUserColor(null);
      sequenceUserColorRef.current = null;
      return;
    }
    const firstMove = sequenceSteps[0]?.node;
    const color =
      guidedSequence.userColor ??
      (firstMove && (firstMove.player === 1 || firstMove.player === 2)
        ? firstMove.player
        : 1);
    bumpCursorIfChanged(0);
    setSequenceUserColor(color);
    sequenceUserColorRef.current = color;
  }, [guidedSequence, sequenceSteps, bumpCursorIfChanged]);

  useEffect(() => {
    if (!guidedSequence) return;
    if (sequenceSteps.length === 0) {
      bumpCursorIfChanged(0);
      return;
    }
    if (state.currentNode === state.root) {
      bumpCursorIfChanged(0);
      return;
    }
    const idx = sequenceSteps.findIndex(
      (step) => step.node === state.currentNode,
    );
    if (idx >= 0) {
      bumpCursorIfChanged(idx + 1);
    }
  }, [
    guidedSequence,
    sequenceSteps,
    state.currentNode,
    state.root,
    bumpCursorIfChanged,
  ]);

  const handleGuidedSequenceMove = (row: number, col: number) => {
    if (!guidedSequence) return false;
    const userColorRaw =
      sequenceUserColorRef.current ??
      sequenceUserColor ??
      guidedSequence.userColor ??
      sequenceSteps[0]?.node.player ??
      1;
    const userColor: 1 | 2 = userColorRaw === 2 ? 2 : 1;
    if (!userColor || sequenceSteps.length === 0) return false;

    let nextCursor = sequenceCursorRef.current;
    const totalSteps = sequenceSteps.length;

    const advanceToNode = (node: MoveNode) => {
      state.setCurrentNode(node);
    };

    const autoPlayOpponent = () => {
      if (!guidedSequence.autoPlayOpponent) return false;
      let advanced = false;
      while (
        nextCursor < totalSteps &&
        sequenceSteps[nextCursor].node.player !== userColor
      ) {
        const node = sequenceSteps[nextCursor].node;
        advanceToNode(node);
        nextCursor++;
        guidedSequence.onAdvanceStep?.(nextCursor, totalSteps);
        advanced = true;
      }
      if (advanced) {
        bumpCursorIfChanged(nextCursor);
        if (nextCursor >= totalSteps) {
          guidedSequence.onComplete?.();
        }
      }
      return advanced;
    };

    const autoPlayedBefore = autoPlayOpponent();

    if (nextCursor >= totalSteps) {
      return true;
    }

    if (
      autoPlayedBefore &&
      sequenceSteps[nextCursor]?.node.player !== userColor
    ) {
      return true;
    }

    const step = sequenceSteps[nextCursor];
    if (!step) {
      guidedSequence.onComplete?.();
      return true;
    }
    const expectedNode = step.node;

    if (
      expectedNode.player !== userColor ||
      expectedNode.row !== row ||
      expectedNode.col !== col
    ) {
      guidedSequence.onWrongMove?.({
        expected: {
          row: expectedNode.row,
          col: expectedNode.col,
          player: expectedNode.player,
        },
        played: { row, col, player: userColor },
      });
      return true;
    }

    advanceToNode(expectedNode);
    nextCursor++;
    guidedSequence.onAdvanceStep?.(nextCursor, totalSteps);

    autoPlayOpponent();

    bumpCursorIfChanged(nextCursor);

    if (nextCursor >= totalSteps) {
      guidedSequence.onComplete?.();
    }

    return true;
  };

  const getNextPlayerForAutoplay = () => {
    if (state.currentNode === state.root) {
      return state.appliedSetup?.toPlay ?? state.root.children[0]?.player ?? 1;
    }
    return state.currentNode.player === 1 ? 2 : 1;
  };

  const handleAutoplayMove = (row: number, col: number) => {
    if (!autoplay) return false;
    if (!sgfText.trim()) return false;
    const nextPlayer = getNextPlayerForAutoplay();
    const match = state.currentNode.children.find(
      (child) =>
        child.row === row && child.col === col && child.player === nextPlayer,
    );
    if (!match) return false;

    let cursor = match;
    let next = cursor.children[0];
    while (next && next.player !== match.player) {
      cursor = next;
      next = cursor.children[0];
    }
    state.setCurrentNode(cursor);
    return true;
  };

  const handleIntersection = (r: number, c: number) => {
    if (isInteractionLocked) return;
    if (
      onBoardClick &&
      onBoardClick(r, c, {
        getLabels: () => state.currentNode.labels ?? [],
        setLabels: state.setCurrentLabels,
        currentNode: state.currentNode,
      })
    )
      return;
    if (guidedSequence) {
      const handled = handleGuidedSequenceMove(r, c);
      if (handled) return;
    }
    if (autoplay) {
      const handled = handleAutoplayMove(r, c);
      if (handled) return;
    }
    state.handleIntersectionClick(r, c);
  };

  const handleSetCurrentNode = useCallback(
    (node: MoveNode) => {
      if (isInteractionLocked) return;
      setCurrentNode(node);
    },
    [isInteractionLocked, setCurrentNode],
  );

  const boardLabels =
    labels && labels.length ? labels : state.currentNode.labels ?? [];
  const boardContainer = (
    <div
      className={boardOnly ? 'w-full max-w-3xl' : 'flex-1 min-w-0'}
      ref={boardBoxRef}
    >
      <div
        style={{
          width: '100%',
          maxWidth: maxBoardWidth ? `${maxBoardWidth}px` : undefined,
        }}
      >
        <GobanBoard
          board={state.board}
          currentNode={state.currentNode}
          root={state.root}
          koPoint={state.koPoint}
          showLiberties={showLiberties}
          showCoordinates={showCoordinates}
          onIntersectionClick={handleIntersection}
          labels={boardLabels}
        />
      </div>
    </div>
  );

  return (
    <div className={`flex ${boardOnly ? 'justify-center' : 'flex-col gap-4'}`}>
      {/* Header toolbar */}
      {!boardOnly && (
        <Toolbar
          {...state}
          playerTurn={state.currentNode.player === 1 ? 'Bianco' : 'Nero'}
          disableBack={disableBack}
          disableForward={disableForward}
          showLiberties={showLiberties}
          setShowLiberties={setShowLiberties}
          showCoordinates={showCoordinates}
          setShowCoordinates={setShowCoordinates}
          onOpenSgf={handleOpenSgf}
          onExportSgf={handleExportSgf}
          onPass={state.handlePass}
          interactionLocked={isInteractionLocked}
        />
      )}

      {/* Body: board left, side column right (stacks on small screens) */}
      <div
        className={
          boardOnly
            ? 'flex w-full justify-center'
            : 'flex flex-col md:flex-row gap-4 items-start'
        }
      >
        {boardContainer}

        {/* Right column: comment panel + move tree */}
        {rightColumnVisible && (
          <div
            className="flex flex-col gap-3"
            style={{ width: 'clamp(260px,28vw,340px)' }}
          >
            <Card className="rounded-xl shadow-md">
              <CardContent className="p-3">
                <label className="block text-sm mb-1">Commento posizione</label>
                <textarea
                  className="w-full rounded border px-2 py-1 text-sm font-mono"
                  placeholder={
                    state.currentNode === state.root
                      ? 'Nessun commento (posizione iniziale)'
                      : 'Scrivi un commento per questa posizione'
                  }
                  value={state.currentNode.comment ?? ''}
                  onChange={(e) => state.setCurrentComment(e.target.value)}
                  readOnly={isInteractionLocked}
                />
              </CardContent>
            </Card>

            {showMoveTree && !isTreeTooLarge && (
              <MoveTree
                key={state.treeRev}
                root={state.root}
                currentNode={state.currentNode}
                setCurrentNode={handleSetCurrentNode}
              />
            )}
            {showMoveTree && isTreeTooLarge && (
              <div className="text-xs text-stone-500 mt-2">
                L&apos;albero delle mosse è molto grande: nascosto per
                prestazioni.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
