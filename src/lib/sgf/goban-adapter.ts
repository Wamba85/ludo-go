// src/lib/sgf/goban-adapter.ts
import { SgfTree } from './ats';
import { astToGo, goToAst, GoMeta, GoNode } from './go-semantic';

export type GobanNode = {
  id: string;
  color?: 'B' | 'W';
  x?: number;
  y?: number; // assenti = pass
  children: GobanNode[];
  meta?: Record<string, string[]>; // C, LB, ecc.
};

// SGF → Goban
export function sgfToGoban(tree: SgfTree) {
  const { meta, root } = astToGo(tree);
  const map = (n: GoNode): GobanNode => ({
    id: n.id,
    color: n.move?.color,
    x: n.move?.pt?.x,
    y: n.move?.pt?.y,
    children: n.children.map(map),
    meta: n.props,
  });
  return { meta, root: map(root) };
}

// Goban → SGF
export function gobanToSgf(meta: GoMeta, root: GobanNode) {
  const toGo = (n: GobanNode): GoNode => ({
    id: n.id,
    move: n.color
      ? n.x != null && n.y != null
        ? { color: n.color, pt: { x: n.x, y: n.y } }
        : { color: n.color, pass: true }
      : undefined,
    props: n.meta,
    children: n.children.map(toGo),
  });
  return goToAst(meta, toGo(root));
}
