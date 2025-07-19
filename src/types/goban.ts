/**
 * Centralised type declarations for the Goban ecosystem.
 * Import simply with `import { MoveNode } from '@/types'`.
 */

/**
 * A node inside the move‑tree (SGF). The root is a virtual node that
 * represents the empty board (depth = ‑1, player = 2 so that Black
 * plays first).
 */
export interface MoveNode {
  /** progressive id assigned at runtime */
  id: number;
  /** board row (0‑based) where the stone is placed */
  row: number;
  /** board column (0‑based) */
  col: number;
  /** 1 = Black, 2 = White */
  player: 1 | 2;
  /** parent node in the variation tree (null for root) */
  parent: MoveNode | null;
  /** child variations; first child is the "main line" */
  children: MoveNode[];
  /** vertical lane index (riga) used in the visual tree */
  branch: number;
  /** horizontal index (colonna) = moveNumber ‑ 1 */
  depth: number;
}

/** Simple helper for prisoner counters */
export type Prisoners = {
  black: number;
  white: number;
};
