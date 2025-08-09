import { SgfCollection, SgfTree } from './ats';

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');

export function stringifyCollection(col: SgfCollection): string {
  return col.trees.map(stringifyTree).join('');
}

export function stringifyTree(t: SgfTree): string {
  const nodes = t.nodes
    .map(
      (n) =>
        ';' +
        n.props
          .map((p) => p.values.map((v) => `${p.id}[${esc(v)}]`).join(''))
          .join(''),
    )
    .join('');
  const kids = t.children.map(stringifyTree).join('');
  return `(${nodes}${kids})`;
}
