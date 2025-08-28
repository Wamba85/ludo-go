import { parseSgf } from './parser';
import { stringifyTree } from './stringify';
import { astToGo, goToAst, GoMeta, GoNode, Color } from './go-semantic';
import type { MoveNode } from '@/types/goban';

const toPlayer = (c: Color): 1 | 2 => (c === 'B' ? 1 : 2);
const toColor = (p: 1 | 2): Color => (p === 1 ? 'B' : 'W');

function goToMoveTree(rootGo: GoNode): MoveNode {
  let nextId = 0;

  const root: MoveNode = {
    id: nextId++,
    parent: null,
    children: [],
    player: 2, // placeholder per root
    row: -1,
    col: -1,
    depth: -1,
    branch: 0,
  };

  type Item = { go: GoNode; uiParent: MoveNode; branchBase: number };
  const queue: Item[] = rootGo.children.map((ch, i) => ({
    go: ch,
    uiParent: root,
    branchBase: i === 0 ? 0 : i,
  }));

  while (queue.length) {
    const { go, uiParent, branchBase } = queue.shift()!;
    const isPass = !go.move?.pt;

    const node: MoveNode = {
      id: nextId++,
      parent: uiParent,
      children: [],
      player: toPlayer(go.move!.color),
      row: isPass ? -1 : go.move!.pt!.y,
      col: isPass ? -1 : go.move!.pt!.x,
      depth: uiParent.depth + 1,
      branch: branchBase,
    };
    uiParent.children.push(node);

    if (go.children[0])
      queue.unshift({
        go: go.children[0],
        uiParent: node,
        branchBase: node.branch,
      });
    for (let i = 1; i < go.children.length; i++)
      queue.unshift({
        go: go.children[i],
        uiParent: node,
        branchBase: node.branch + i,
      });
  }
  return root;
}

function moveTreeToGo(root: MoveNode): GoNode {
  const toGo = (n: MoveNode): GoNode => {
    const hasMove = n.depth >= 0;
    const move = hasMove
      ? n.row === -1 || n.col === -1
        ? { color: toColor(n.player), pass: true as const }
        : { color: toColor(n.player), pt: { x: n.col, y: n.row } }
      : undefined;

    return {
      id: `n${n.id}`,
      move,
      props: undefined,
      children: n.children.map(toGo),
    };
  };

  return {
    id: `n${root.id}`,
    move: undefined,
    props: undefined,
    children: root.children.map(toGo),
  };
}

export function loadSgfToMoveTree(s: string) {
  const col = parseSgf(s);
  const { meta, root } = astToGo(col.trees[0]);
  return { meta, root: goToMoveTree(root) };
}

export function exportMoveTreeToSgf(meta: GoMeta, root: MoveNode) {
  const goRoot = moveTreeToGo(root);
  const ast = goToAst(meta, goRoot);
  return stringifyTree(ast);
}

export const defaultMeta = (size: number): GoMeta => ({
  size,
  ff: 4,
  ca: 'UTF-8',
});
