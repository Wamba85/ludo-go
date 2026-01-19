import { parseSgf } from './parser';
import { stringifyTree } from './stringify';
import { astToGo, goToAst, GoMeta, GoNode, Color, coordToSgf } from './go-semantic';
import type { Label, LabelKind, MoveNode } from '@/types/goban';

const toPlayer = (c: Color): 1 | 2 => (c === 'B' ? 1 : 2);
const toColor = (p: 1 | 2): Color => (p === 1 ? 'B' : 'W');

const parsePoint = (pt: string) => {
  if (!pt || pt.length < 2) return null;
  return { r: pt.charCodeAt(1) - 97, c: pt.charCodeAt(0) - 97 };
};

const propsToLabels = (
  props?: Record<string, string[]>,
): Label[] | undefined => {
  if (!props) return undefined;
  const out: Label[] = [];
  const addShape = (kind: LabelKind, key: 'TR' | 'SQ' | 'CR' | 'MA') => {
    const vals = props[key] ?? [];
    vals.forEach((pt) => {
      const pos = parsePoint(pt);
      if (!pos) return;
      out.push({ r: pos.r, c: pos.c, kind });
    });
  };
  addShape('TR', 'TR');
  addShape('SQ', 'SQ');
  addShape('CR', 'CR');
  addShape('MA', 'MA');

  const lbVals = props.LB ?? [];
  lbVals.forEach((raw) => {
    const [pt, text] = raw.split(':');
    const pos = parsePoint(pt ?? '');
    if (!pos || !text) return;
    out.push({ r: pos.r, c: pos.c, kind: 'LB', text });
  });

  return out.length ? out : undefined;
};

const labelsToProps = (
  labels?: Label[],
): Record<string, string[]> | undefined => {
  if (!labels || labels.length === 0) return undefined;
  const props: Record<string, string[]> = {};
  labels.forEach((lb) => {
    if (lb.kind === 'LB') {
      if (!lb.text) return;
      const val = `${coordToSgf({ x: lb.c, y: lb.r })}:${lb.text}`;
      props.LB = (props.LB ?? []).concat(val);
      return;
    }
    const key = lb.kind as 'TR' | 'SQ' | 'CR' | 'MA';
    const val = coordToSgf({ x: lb.c, y: lb.r });
    props[key] = (props[key] ?? []).concat(val);
  });
  return Object.keys(props).length ? props : undefined;
};

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
      labels: propsToLabels(go.props),
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

    const props: Record<string, string[]> = {};
    if (n.comment) props.C = [n.comment];
    const labelProps = labelsToProps(n.labels);
    if (labelProps) {
      Object.keys(labelProps).forEach((k) => {
        props[k] = labelProps[k];
      });
    }
    const outProps = Object.keys(props).length ? props : undefined;

    return {
      id: `n${n.id}`,
      move,
      props: outProps,
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
    const rest = { ...meta.extras };
    delete rest.C;
    meta.extras = rest;
  }
  const rootLabels = propsToLabels(
    (meta.extras ?? {}) as Record<string, string[]>,
  );
  if (rootLabels) uiRoot.labels = rootLabels;
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
  if (root.labels !== undefined) {
    const labelProps = labelsToProps(root.labels);
    ['TR', 'SQ', 'CR', 'MA', 'LB'].forEach((k) => delete metaExtras[k]);
    if (labelProps) {
      Object.keys(labelProps).forEach((k) => {
        metaExtras[k] = labelProps[k];
      });
    }
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
