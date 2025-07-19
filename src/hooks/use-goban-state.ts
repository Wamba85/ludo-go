/**
 * `useGobanState` incapsula **tutta** la logica di gioco / navigazione per il
 * componente Goban.  Nessuna parte di rendering vive qui: il risultato è un
 * hook "head‑less" facile da testare e riutilizzare.
 */

'use client';
import { useState, useRef, useEffect } from 'react';
import { buildTree } from '@/lib/parser-sgf-meta';
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

export function useGobanState(
  sgfMoves: string,
  boardSize = BOARD_SIZE_DEFAULT,
) {
  /* --------------------------------------------------------------------- */
  /* 1. Albero mosse                                                       */
  /* --------------------------------------------------------------------- */
  // Il root è un nodo "virtuale" che rappresenta la tavola vuota.
  const root = useRef<MoveNode>(buildTree(sgfMoves)).current;
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

  /* --------------------------------------------------------------------- */
  /* 3. Click su una intersezione                                          */
  /* --------------------------------------------------------------------- */
  const handleIntersectionClick = (row: number, col: number) => {
    // vietato giocare sulla posizione di ko
    if (koPoint && koPoint[0] === row && koPoint[1] === col) return;

    /* 1 → se esiste già un figlio con la stessa mossa, navighiamo. */
    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }

    /* 2 → determiniamo la "branch row" da assegnare al nuovo nodo. */
    let insertRow: number;

    if (currentNode.children.length === 0) {
      // continua la linea principale → stessa riga del padre
      insertRow = currentNode.branch;
    } else {
      // nuovo ramo
      const maxInSubtree = (node: MoveNode): number => {
        let m = node.branch;
        node.children.forEach((ch) => {
          m = Math.max(m, maxInSubtree(ch));
        });
        return m;
      };

      const maxSiblingBranch = currentNode.children.reduce(
        (m, ch) => Math.max(m, maxInSubtree(ch)),
        currentNode.branch,
      );
      insertRow = maxSiblingBranch + 1;

      // spostiamo in basso tutto ciò che sta da insertRow in poi
      shiftBranches(root, insertRow);
    }

    /* 3 → creiamo il nuovo nodo e aggiorniamo lo stato */
    const newNode: MoveNode = {
      id: nextId.current++,
      row,
      col,
      player: currentNode.player === 1 ? 2 : 1,
      parent: currentNode,
      children: [],
      branch: insertRow,
      depth: currentNode.depth + 1,
    };

    currentNode.children.push(newNode);
    setCurrentNode(newNode);
  };

  /* --------------------------------------------------------------------- */
  /* 4. Ricostruzione completa del goban quando cambia currentNode         */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    // board vergine
    const b = createInitialBoard(boardSize);
    let prB = 0,
      prW = 0;
    let tmpKo: [number, number] | null = null;

    // direzioni ortogonali
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    // riproduciamo le mosse dalla radice fino al currentNode
    const replay: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n !== root; n = n.parent) {
      replay.unshift(n);
    }

    replay.forEach((mv, idx) => {
      const { row, col } = mv;
      if (b[row][col]) return; // mossa duplicata (should not happen)

      const player = mv.player;
      const opp = player === 1 ? 2 : 1;

      b[row][col] = player;

      // controlliamo le eventuali catture
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
            if (chain.size === 1) singleCaptured = [ny, nx]; // ko check
            chain.forEach((p) => {
              const [r, c] = p.split(',').map(Number);
              b[r][c] = 0; // rimuovi pietra
            });
            captured += chain.size;
            chain.forEach((p) => visited.add(p));
          }
        }
      });

      // aggiorniamo i prigionieri
      if (player === 1) prB += captured;
      else prW += captured;

      // gestione KO: solo se l'ultima mossa ha catturato esattamente 1 pietra
      if (idx === replay.length - 1 && captured === 1 && singleCaptured) {
        tmpKo = singleCaptured;
      }
    });

    setBoard(b);
    setPrisoners({ black: prB, white: prW });
    setKoPoint(tmpKo);
  }, [currentNode, boardSize, root]);

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
    /* stato */
    board,
    prisoners,
    koPoint,
    currentNode,
    root,

    /* azioni */
    handleIntersectionClick,
    toStart,
    back,
    forward,
    toEnd,
    setCurrentNode, // necessario per MoveTree
  } as const;
}
