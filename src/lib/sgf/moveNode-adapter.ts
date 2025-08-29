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
      comment: go.props?.C ? go.props.C.join('\n') : undefined,
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

    const props = n.comment ? { C: [n.comment] } : undefined;

    return {
      id: `n${n.id}`,
      move,
      props,
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
  const uiRoot = goToMoveTree(root);
  // Root-level comment: SGF allows C[...] on the root node.
  // We map it to the UI root MoveNode.comment for round-trip editing.
  if (meta.extras?.C && meta.extras.C.length) {
    uiRoot.comment = meta.extras.C.join('\n');
    // Remove from extras so we don't duplicate when exporting later.
    const { C, ...rest } = meta.extras;
    meta.extras = rest;
  }
  return { meta, root: uiRoot };
}

export function exportMoveTreeToSgf(meta: GoMeta, root: MoveNode) {
  const goRoot = moveTreeToGo(root);
  // Inject root comment (if any) into root props as C[...] via meta.extras
  const metaExtras = { ...(meta.extras ?? {}) } as Record<string, string[]>;
  if (root.comment && root.comment.trim()) {
    const lines = [root.comment];
    metaExtras.C = lines; // overwrite or set; root comment is single string
  }
  const metaWithRootC: GoMeta = { ...meta, extras: metaExtras };
  const ast = goToAst(metaWithRootC, goRoot);
  return stringifyTree(ast);
}

export const defaultMeta = (size: number): GoMeta => ({
  size,
  ff: 4,
  ca: 'UTF-8',
});
