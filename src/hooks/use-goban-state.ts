/**
 * `useGobanState` incapsula **tutta** la logica di gioco / navigazione per il
 * componente Goban.  Nessuna parte di rendering vive qui: il risultato è un
 * hook "head‑less" facile da testare e riutilizzare.
 */

'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { buildTree } from '@/lib/parser-sgf-meta';
import { loadSgfToMoveTree, defaultMeta } from '@/lib/sgf/moveNode-adapter';
import {
  createInitialBoard,
  getChainAndLiberties,
  shiftBranches,
} from '@/utils/go-maths';
import { BOARD_SIZE_DEFAULT } from '@/utils/constants';
import type { MoveNode } from '@/types/goban';

interface PrisonerCount {
  black: number;
  white: number;
}

export type Setup = {
  size: number; // es. 9
  stones: { r: number; c: number; color: 1 | 2 }[]; // 1=nero, 2=bianco
  toPlay: 1 | 2; // chi muove per primo
};

export type AfterPlayCtx = {
  board: number[][];
  prisoners: { black: number; white: number };
  currentNode: MoveNode;
  root: MoveNode;
  lastMove?: MoveNode;
};

export function useGobanState(
  sgfMoves: string,
  boardSize = BOARD_SIZE_DEFAULT,
  opts?: { setup?: Setup; onAfterPlay?: (ctx: AfterPlayCtx) => void },
) {
  /* --------------------------------------------------------------------- */
  /* 1. Albero mosse                                                       */
  /* --------------------------------------------------------------------- */
  // Il root è un nodo "virtuale" che rappresenta la tavola vuota.
  // Parse SGF completo (AB/AW ecc.) con fallback al builder leggero.
  const initialParsed = useMemo(() => {
    const s = sgfMoves?.trim() ?? '';
    if (s.startsWith('(')) {
      try {
        const { meta, root } = loadSgfToMoveTree(s);
        return { meta, root };
      } catch (e) {
        // fallthrough to simple builder
      }
    }
    return { meta: defaultMeta(boardSize), root: buildTree(sgfMoves) };
  }, []);
  const [meta, setMeta] = useState(initialParsed.meta);
  const [root, setRoot] = useState<MoveNode>(initialParsed.root);
  const [currentNode, setCurrentNode] = useState<MoveNode>(root);
  const nextId = useRef(1);

  /* --------------------------------------------------------------------- */
  /* 2. Stato goban (board, prigionieri, ko)                               */
  /* --------------------------------------------------------------------- */
  const [board, setBoard] = useState<number[][]>(createInitialBoard(boardSize));
  const [prisoners, setPrisoners] = useState<PrisonerCount>({
    black: 0,
    white: 0,
  });
  const [koPoint, setKoPoint] = useState<[number, number] | null>(null);
  const [treeRev, setTreeRev] = useState(0);

  // Deriva setup: preferisci quello esplicito da opts, altrimenti da meta.setup (AB/AW)
  const derivedSetup: Setup | undefined = useMemo(() => {
    if (opts?.setup) return opts.setup;
    const m: any = meta as any;
    const metaSetup = m?.setup as
      | { AB?: { x: number; y: number }[]; AW?: { x: number; y: number }[] }
      | undefined;
    if (!metaSetup) return undefined;
    const stones: { r: number; c: number; color: 1 | 2 }[] = [];
    metaSetup.AB?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 1 }));
    metaSetup.AW?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 2 }));
    // Deduci toPlay dal primo figlio se disponibile, altrimenti Nero
    const first = root.children[0];
    const toPlay: 1 | 2 = first ? first.player : 1;
    return { size: (meta as any)?.size ?? boardSize, stones, toPlay };
  }, [opts?.setup, meta, root, boardSize]);

  const nextPlayer =
    currentNode === root
      ? (derivedSetup?.toPlay ?? (currentNode.player === 1 ? 2 : 1))
      : currentNode.player === 1
        ? 2
        : 1;

  // Stabilizza la callback onAfterPlay per evitare ri-render non necessari
  const onAfterPlayRef = useRef(opts?.onAfterPlay);
  useEffect(() => {
    onAfterPlayRef.current = opts?.onAfterPlay;
  }, [opts?.onAfterPlay]);

  useEffect(() => {
    const s = sgfMoves?.trim() ?? '';
    if (s.startsWith('(')) {
      try {
        const { meta: m, root: r } = loadSgfToMoveTree(s);
        setMeta(m);
        setRoot(r);
        setCurrentNode(r);
        nextId.current = 1;
        return;
      } catch (e) {
        // fallback sotto
      }
    }
    const newRoot = buildTree(sgfMoves);
    setMeta(defaultMeta(boardSize));
    setRoot(newRoot);
    setCurrentNode(newRoot);
    nextId.current = 1; // oppure riallinea con max id se lo usi
  }, [sgfMoves]);

  /* --------------------------------------------------------------------- */
  /* 3. Click su una intersezione                                          */
  /* --------------------------------------------------------------------- */
  const handleIntersectionClick = (row: number, col: number) => {
    if (koPoint && koPoint[0] === row && koPoint[1] === col) return;

    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }

    const insertRow =
      currentNode.children.length === 0
        ? currentNode.branch
        : (() => {
            const maxInSubtree = (n: MoveNode): number => {
              let m = n.branch;
              n.children.forEach((ch) => {
                m = Math.max(m, maxInSubtree(ch));
              });
              return m;
            };
            const maxSiblingBranch = currentNode.children.reduce(
              (m, ch) => Math.max(m, maxInSubtree(ch)),
              currentNode.branch,
            );
            const r = maxSiblingBranch + 1;
            shiftBranches(root, r);
            return r;
          })();

    const newNode: MoveNode = {
      id: nextId.current++,
      row,
      col,
      player: nextPlayer,
      parent: currentNode,
      children: [],
      branch: insertRow,
      depth: currentNode.depth + 1,
    };

    currentNode.children.push(newNode);
    setCurrentNode(newNode);
    setTreeRev((r) => r + 1);
  };

  /* --------------------------------------------------------------------- */
  /* 4. Ricostruzione completa del goban quando cambia currentNode         */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    const b = createInitialBoard(boardSize);

    // 1) applica setup iniziale
    if (derivedSetup) {
      if (derivedSetup.size !== boardSize)
        console.warn('setup.size != boardSize');
      for (const s of derivedSetup.stones) {
        if (s.r >= 0 && s.r < boardSize && s.c >= 0 && s.c < boardSize)
          b[s.r][s.c] = s.color;
      }
    }

    // 2) replay mosse fino al currentNode
    let prB = 0,
      prW = 0;
    let tmpKo: [number, number] | null = null;
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    const replay: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n.parent; n = n.parent)
      replay.unshift(n);

    replay.forEach((mv, idx) => {
      const row = mv.row as number,
        col = mv.col as number;
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(col) ||
        row < 0 ||
        col < 0 ||
        row >= boardSize ||
        col >= boardSize
      )
        return;
      if (b[row][col]) return;

      const player = mv.player,
        opp = player === 1 ? 2 : 1;
      b[row][col] = player;

      let captured = 0;
      let singleCaptured: [number, number] | null = null;
      const visited = new Set<string>();

      dirs.forEach(([dy, dx]) => {
        const ny = row + dy,
          nx = col + dx;
        if (
          ny >= 0 &&
          ny < boardSize &&
          nx >= 0 &&
          nx < boardSize &&
          b[ny][nx] === opp &&
          !visited.has(`${ny},${nx}`)
        ) {
          const { chain, liberties } = getChainAndLiberties(
            ny,
            nx,
            b,
            boardSize,
          );
          if (liberties === 0) {
            if (chain.size === 1) singleCaptured = [ny, nx];
            chain.forEach((p) => {
              const [r, c] = p.split(',').map(Number);
              b[r][c] = 0;
              visited.add(p);
            });
            captured += chain.size;
          }
        }
      });

      if (player === 1) prB += captured;
      else prW += captured;
      if (idx === replay.length - 1 && captured === 1 && singleCaptured)
        tmpKo = singleCaptured;
    });

    setBoard(b);
    setPrisoners({ black: prB, white: prW });
    setKoPoint(tmpKo);

    // 3) callback esercizio (usando ref stabile)
    onAfterPlayRef.current?.({
      board: b,
      prisoners: { black: prB, white: prW },
      currentNode,
      root,
      lastMove: currentNode !== root ? currentNode : undefined,
    });
  }, [currentNode, boardSize, root, derivedSetup]);

  /* --------------------------------------------------------------------- */
  /* 5. Navigazione convenience                                            */
  /* --------------------------------------------------------------------- */
  const toStart = () => setCurrentNode(root);
  const back = () => currentNode.parent && setCurrentNode(currentNode.parent);
  const forward = () =>
    currentNode.children[0] && setCurrentNode(currentNode.children[0]);
  const toEnd = () => {
    let n = currentNode;
    while (n.children[0]) n = n.children[0];
    setCurrentNode(n);
  };

  /* --------------------------------------------------------------------- */
  /* 6. API esportata                                                      */
  /* --------------------------------------------------------------------- */
  return {
    board,
    prisoners,
    koPoint,
    currentNode,
    root,
    handleIntersectionClick,
    toStart,
    back,
    forward,
    toEnd,
    setCurrentNode,
    meta,
    treeRev,
  } as const;
}
