// src/lib/sgf/useSgfIO.ts
import { parseSgf } from './parser';
import { sgfToGoban } from './goban-adapter';
import type { GoMeta } from './go-semantic';
import { MoveNode } from '@/types/goban';
import { exportMoveTreeToSgf } from './moveNode-adapter';

export function loadSgf(s: string) {
  const col = parseSgf(s);
  return sgfToGoban(col.trees[0]); // { meta, root }
}

export function exportSgf(meta: GoMeta, root: MoveNode) {
  return exportMoveTreeToSgf(meta, root);
}
