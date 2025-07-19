/**
 * Utilities for basic Go logic (board creation, liberties, branch shifting).
 * All functions here are **pure** and have zero React dependencies, so they
 * can be tested with plain Jest and run on both server and client.
 */

import { MoveNode } from '@/types/goban';

/* ------------------------------------------------------------------ */
/* Board helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Create an N×N matrix filled with zeros representing an empty Goban.
 */
export function createInitialBoard(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

/**
 * Return the column labels A, B, … (skipping the letter I as per SGF spec).
 */
export function getColumnLabels(size: number): string[] {
  const out: string[] = [];
  for (let code = 65; out.length < size; code++) {
    const letter = String.fromCharCode(code);
    if (letter !== 'I') out.push(letter);
  }
  return out;
}

/* Orthogonal neighbour directions */
const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Given a stone at (r,c), return its whole chain and the number of liberties
 * that chain currently enjoys.
 */
export function getChainAndLiberties(
  r: number,
  c: number,
  board: number[][],
  size: number,
) {
  const color = board[r][c];
  if (color === 0) {
    throw new Error('getChainAndLiberties(): starting point is empty.');
  }

  const chain = new Set<string>();
  const liberties = new Set<string>();
  const stack: [number, number][] = [[r, c]];

  while (stack.length) {
    const [y, x] = stack.pop()!;
    const key = `${y},${x}`;
    if (chain.has(key)) continue;
    chain.add(key);

    for (const [dy, dx] of DIRS) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny < 0 || ny >= size || nx < 0 || nx >= size) continue;

      const spot = board[ny][nx];
      if (spot === 0) {
        liberties.add(`${ny},${nx}`);
      } else if (spot === color) {
        stack.push([ny, nx]);
      }
    }
  }

  return { chain, liberties: liberties.size } as const;
}

/**
 * Recursively shift every node in the move‑tree whose `branch` index is
 * **≥ `from`** down by one. This is used when inserting a new variation so
 * that branch indices stay unique throughout the entire tree.
 */
export function shiftBranches(node: MoveNode, from: number): void {
  if (node.branch >= from) node.branch += 1;
  node.children.forEach((child) => shiftBranches(child, from));
}
