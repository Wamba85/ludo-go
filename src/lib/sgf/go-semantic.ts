import { SgfNode, SgfProp, SgfTree } from './ats';

export type Color = 'B' | 'W';
export type Coord = { x: number; y: number }; // 0-based, (0,0) = angolo alto-sinistra SGF

export type GoMeta = {
  size: number; // SZ
  km?: number; // KM
  ha?: number; // HA
  rules?: string; // RU
  result?: string; // RE
  app?: string; // AP
  ff?: number; // FF
  ca?: string; // CA
  extras?: Record<string, string[]>; // altre prop root preservate
  setup?: { AB?: Coord[]; AW?: Coord[]; AE?: Coord[] };
};

export type GoMove = {
  color: Color;
  pt?: Coord;
  pass?: true;
  props?: Record<string, string[]>;
};
export type GoNode = {
  id: string;
  move?: GoMove;
  props?: Record<string, string[]>;
  children: GoNode[];
};

const aCode = 'a'.charCodeAt(0);

export const sgfPointToCoord = (pt: string): Coord => ({
  x: pt.charCodeAt(0) - aCode,
  y: pt.charCodeAt(1) - aCode,
});

export const coordToSgf = (c: Coord): string =>
  String.fromCharCode(aCode + c.x) + String.fromCharCode(aCode + c.y);

export function astToGo(tree: SgfTree): { meta: GoMeta; root: GoNode } {
  const rootNode = tree.nodes[0] ?? { props: [] };
  const meta: GoMeta = { size: 19, extras: {}, setup: {} };

  // root props
  for (const p of rootNode.props) {
    if (p.id === 'GM' && p.values[0] !== '1')
      throw new Error('Solo GM[1] supportato');
    if (p.id === 'SZ') meta.size = parseInt(p.values[0], 10);
    else if (p.id === 'KM') meta.km = parseFloat(p.values[0]);
    else if (p.id === 'HA') meta.ha = parseInt(p.values[0], 10);
    else if (p.id === 'RU') meta.rules = p.values[0];
    else if (p.id === 'RE') meta.result = p.values[0];
    else if (p.id === 'AP') meta.app = p.values.join(':');
    else if (p.id === 'FF') meta.ff = parseInt(p.values[0], 10);
    else if (p.id === 'CA') meta.ca = p.values[0];
    else if (p.id === 'AB' || p.id === 'AW' || p.id === 'AE') {
      const key = p.id as 'AB' | 'AW' | 'AE';
      const vals = p.values.filter(Boolean).map(sgfPointToCoord);
      const prev = meta.setup![key] ?? [];
      meta.setup![key] = prev.concat(vals);
    } else {
      meta.extras![p.id] = p.values;
    }
  }

  // build main sequence node chain then attach variations
  const buildLinear = (nodes: SgfNode[]): GoNode[] => {
    return nodes.map((n, idx) => {
      const mp = n.props.find((pp) => pp.id === 'B' || pp.id === 'W');
      const move: GoMove | undefined = mp
        ? mp.values[0] === ''
          ? { color: mp.id as Color, pass: true }
          : { color: mp.id as Color, pt: sgfPointToCoord(mp.values[0]) }
        : undefined;
      const rest: Record<string, string[]> = {};
      for (const p of n.props) if (p !== mp) rest[p.id] = p.values;
      return {
        id: `n${idx}`,
        move,
        props: Object.keys(rest).length ? rest : undefined,
        children: [],
      };
    });
  };

  const linear = buildLinear(tree.nodes);
  for (let i = 0; i < linear.length - 1; i++)
    linear[i].children.push(linear[i + 1]);

  const attachVariations = (parentAstTail: SgfTree, parentGoNode: GoNode) => {
    for (const child of parentAstTail.children) {
      const sub = astToGo(child); // ricorsivo su sotto-albero
      parentGoNode.children.push(sub.root);
    }
  };

  const rootGo = linear[0] ?? { id: 'n0', children: [] };
  // Attacca variazioni al nodo dell’ultima mossa della sequenza locale
  const last = linear[linear.length - 1] ?? rootGo;
  attachVariations(tree, last);

  return { meta, root: rootGo };
}

export function goToAst(meta: GoMeta, root: GoNode): SgfTree {
  const rootProps: SgfProp[] = [];
  rootProps.push({ id: 'FF', values: [String(meta.ff ?? 4)] });
  rootProps.push({ id: 'CA', values: [meta.ca ?? 'UTF-8'] });
  rootProps.push({ id: 'GM', values: ['1'] });
  rootProps.push({ id: 'SZ', values: [String(meta.size)] });
  if (meta.km != null) rootProps.push({ id: 'KM', values: [String(meta.km)] });
  if (meta.ha != null) rootProps.push({ id: 'HA', values: [String(meta.ha)] });
  if (meta.rules) rootProps.push({ id: 'RU', values: [meta.rules] });
  if (meta.result) rootProps.push({ id: 'RE', values: [meta.result] });
  if (meta.app) rootProps.push({ id: 'AP', values: [meta.app] });

  const extras: Record<string, string[]> = meta.extras ?? {};
  for (const k of Object.keys(extras))
    rootProps.push({ id: k, values: extras[k] });

  const setup = meta.setup ?? {};
  if (setup.AB?.length)
    rootProps.push({ id: 'AB', values: setup.AB.map(coordToSgf) });
  if (setup.AW?.length)
    rootProps.push({ id: 'AW', values: setup.AW.map(coordToSgf) });
  if (setup.AE?.length)
    rootProps.push({ id: 'AE', values: setup.AE.map(coordToSgf) });

  const nodes: SgfNode[] = [{ props: rootProps }];

  const walk = (g: GoNode): SgfTree => {
    const hereProps: SgfProp[] = [];
    if (g.move) {
      const id = g.move.color;
      const v = g.move.pass ? '' : coordToSgf(g.move.pt!);
      hereProps.push({ id, values: [v] }); // B[]/W[] per pass come da standard
    }
    if (g.props)
      for (const k of Object.keys(g.props))
        hereProps.push({ id: k, values: g.props[k] });

    const seqNode = g.move ? [{ props: hereProps }] : [];
    const mainChild = g.children[0];
    const restVar = g.children.slice(1);

    // ramo principale: concatena
    let mainSeq: SgfNode[] = seqNode;
    let tailTree: SgfTree | undefined;
    if (mainChild) {
      const sub = walk(mainChild);
      mainSeq = seqNode.concat(sub.nodes);
      tailTree = sub;
    }

    // variazioni
    const children: SgfTree[] = [];
    if (tailTree) children.push(...tailTree.children);
    for (const v of restVar) children.push(walk(v));

    return { nodes: mainSeq, children };
  };

  const body = walk(root);
  // unisci root + corpo
  const tree: SgfTree = {
    nodes: [nodes[0], ...body.nodes],
    children: body.children,
  };
  return tree;
}
