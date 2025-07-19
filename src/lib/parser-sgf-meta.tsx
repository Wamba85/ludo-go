/* parseSgfMeta.ts ------------------------------------------------------- */

import { SgfMeta, SgfRecord } from '@/types/sgf-meta';
import { useState } from 'react';

const rx = (k: string) => new RegExp(`${k}\\[([^\\]]*)\\]`, 'i');
const num = (v?: string) => (v ? +v : undefined);

export function parseSgf(sgf: string): SgfRecord {
  const read = (k: string) => sgf.match(rx(k))?.[1];

  const meta: SgfMeta = {
    /* root */
    fileFormat: num(read('FF')),
    gameId: num(read('GM')),
    charset: read('CA'),
    application: read('AP'),
    style: num(read('ST')),
    boardSize: num(read('SZ')),

    /* game-info */
    annotation: read('AN'),
    blackRank: read('BR'),
    blackTeam: read('BT'),
    copyright: read('CP'),
    date: read('DT'),
    event: read('EV'),
    gameName: read('GN'),
    gameComment: read('GC'),
    opening: read('ON'),
    overtime: read('OT'),
    blackPlayer: read('PB'),
    place: read('PC'),
    whitePlayer: read('PW'),
    result: read('RE'),
    round: read('RO'),
    rules: read('RU'),
    source: read('SO'),
    timeLimit: num(read('TM')),
    user: read('US'),
    whiteRank: read('WR'),
    whiteTeam: read('WT'),

    /* timing */
    blackTimeLeft: num(read('BL')),
    whiteTimeLeft: num(read('WL')),
    blackOtStones: num(read('OB')),
    whiteOtStones: num(read('OW')),
  };

  return { meta, sgf };
}

export default function SgfUploader() {
  const [meta, setMeta] = useState<SgfRecord | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    setMeta(parseSgf(txt));
  };

  return (
    <div>
      <input type="file" accept=".sgf" onChange={handleFile} />
      {meta && (
        <pre
          className="bg-gray-200 p-2
    whitespace-pre-wrap   /* preserva \r\n ma consente il wrap            */
    break-all            /* spezza anche parole lunghissime                */
    overflow-auto        /* scroll interno se serve                        */
    max-h-64             /* limite d’altezza (es. 16 rem ≈ 256 px)         */
    rounded"
        >
          {JSON.stringify(meta, null, 2)}
        </pre>
      )}
    </div>
  );
}

// stripMeta.ts  – mantiene ( ) ;  e B[xx]/W[xx]
export function stripMeta(full: string): string {
  return full.match(/(\(|\)|;|[BW]\[[^\]]*])/g)?.join('') ?? '';
}

type MoveNode = {
  id: number;
  row: number;
  col: number;
  player: 1 | 2;
  parent: MoveNode | null;
  children: MoveNode[];
  branch: number;
  depth: number;
};

export function buildTree(sgfMoves: string): MoveNode {
  let id = 1;
  const root: MoveNode = {
    id: 0,
    row: -1,
    col: -1,
    player: 2,
    parent: null,
    children: [],
    branch: 0,
    depth: -1,
  };

  let cur = root;
  const stack: MoveNode[] = [];

  const nextBranch = (parent: MoveNode) =>
    parent.children.length === 0
      ? parent.branch
      : Math.max(...parent.children.map((c) => c.branch)) + 1;

  for (let i = 0; i < sgfMoves.length; ) {
    const c = sgfMoves[i];

    if (c === '(') {
      stack.push(cur);
      i++;
    } else if (c === ')') {
      cur = stack.pop() ?? root;
      i++;
    } else if (c === ';') {
      i++;
      while (/\s/.test(sgfMoves[i])) i++; // skip spazi
      const col = sgfMoves[i];
      if ((col === 'B' || col === 'W') && sgfMoves[i + 1] === '[') {
        const player: 1 | 2 = col === 'B' ? 1 : 2;
        i += 2;
        const j = sgfMoves.indexOf(']', i);
        const coords = sgfMoves.slice(i, j);
        i = j + 1;

        const row = coords.length === 2 ? coords.charCodeAt(1) - 97 : -1; // pass = -1
        const colN = coords.length === 2 ? coords.charCodeAt(0) - 97 : -1;

        const node: MoveNode = {
          id: id++,
          row,
          col: colN,
          player,
          parent: cur,
          children: [],
          depth: cur.depth + 1,
          branch: cur.children.length ? nextBranch(cur) : cur.branch,
        };
        cur.children.push(node);
        cur = node;
      }
    } else i++; // qualunque altra cosa la ignoro
  }
  return root;
}
