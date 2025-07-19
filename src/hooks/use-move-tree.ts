/**
 * React hook that extracts a *flat* list of nodes from the SGF tree and
 * pre‑calcola le dimensioni dell’area SVG in cui disegnare l’albero.
 * È *pure* (usa solo `useMemo`) quindi è facilissimo da testare.
 */

'use client';
import { useMemo } from 'react';
import {
  COL_SPACING,
  ROW_SPACING,
  NODE_RADIUS,
  TREE_MARGIN,
} from '@/utils/constants';
import { MoveNode } from '@/types/goban';

interface MoveTreeData {
  /** nodi (escluso root) in ordine arbitrario, già pronti per il render */
  nodes: MoveNode[];
  /** larghezza dell’area svg (px) */
  treeW: number;
  /** altezza dell’area svg (px) */
  treeH: number;
}

export function useMoveTree(root: MoveNode): MoveTreeData {
  return useMemo(() => {
    /* ----- raccolta nodi ------------------------------------------------- */
    const nodes: MoveNode[] = [];
    const walk = (n: MoveNode) => {
      if (n !== root) nodes.push(n);
      n.children.forEach(walk);
    };
    walk(root);

    /* ----- dimensioni SVG ----------------------------------------------- */
    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
    const maxBranch = nodes.reduce((m, n) => Math.max(m, n.branch), 0);

    const treeW = TREE_MARGIN * 2 + maxDepth * COL_SPACING + NODE_RADIUS * 2;
    const treeH = TREE_MARGIN * 2 + maxBranch * ROW_SPACING + NODE_RADIUS * 2;

    return { nodes, treeW, treeH };
  }, [root]);
}
