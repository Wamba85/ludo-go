/**
 * Component that renders the move‑tree on the right‑hand side of the Goban.
 * Uses `useMoveTree` to keep the rendering logic minimal.
 */

'use client';
import React from 'react';
import { useMoveTree } from '@/hooks/use-move-tree';
import type { MoveNode } from '@/types/goban';
import {
  COL_SPACING,
  ROW_SPACING,
  NODE_RADIUS,
  TREE_MARGIN,
} from '@/utils/constants';

interface Props {
  root: MoveNode;
  currentNode: MoveNode;
  setCurrentNode: (n: MoveNode) => void;
}

export default function MoveTree({ root, currentNode, setCurrentNode }: Props) {
  const { nodes, treeW, treeH } = useMoveTree(root);
  const extraCol = COL_SPACING; // spazio per nodo iniziale

  return (
    <div
      className="border border-gray-300 p-2 overflow-auto resize"
      style={{
        width: 'clamp(260px,28vw,340px)',
        height: 'clamp(220px,50vh,480px)',
        flex: '0 0 clamp(260px,28vw,340px)',
      }}
    >
      <svg width={treeW + extraCol} height={treeH}>
        {/* root → edges verso i figli diretti */}
        {root.children.map((child) => {
          const pCx = TREE_MARGIN + NODE_RADIUS; // root in colonna 0
          const pCy = TREE_MARGIN + root.branch * ROW_SPACING + NODE_RADIUS; // riga 0
          const cCx =
            TREE_MARGIN + (child.depth * COL_SPACING + extraCol) + NODE_RADIUS;
          const cCy = TREE_MARGIN + child.branch * ROW_SPACING + NODE_RADIUS;

          if (child.branch === root.branch) {
            return (
              <line
                key={`edge-root-${child.depth}-${child.branch}`}
                x1={pCx + NODE_RADIUS}
                y1={pCy}
                x2={cCx - NODE_RADIUS}
                y2={cCy}
                stroke="black"
              />
            );
          }
          if (child.branch > root.branch) {
            return (
              <polyline
                key={`edge-root-${child.depth}-${child.branch}`}
                points={`${pCx},${pCy + NODE_RADIUS} ${pCx},${cCy} ${cCx - NODE_RADIUS},${cCy}`}
                fill="none"
                stroke="black"
              />
            );
          }
          return (
            <line
              key={`edge-root-${child.depth}-${child.branch}`}
              x1={pCx + NODE_RADIUS}
              y1={pCy}
              x2={cCx - NODE_RADIUS}
              y2={pCy}
              stroke="black"
            />
          );
        })}
        {/* edges */}
        {nodes.map((n) => {
          if (!n.parent || n.parent === root) return null;

          const pCx =
            TREE_MARGIN +
            (n.parent.depth * COL_SPACING + extraCol) +
            NODE_RADIUS;
          const pCy = TREE_MARGIN + n.parent.branch * ROW_SPACING + NODE_RADIUS;
          const cCx =
            TREE_MARGIN + (n.depth * COL_SPACING + extraCol) + NODE_RADIUS;
          const cCy = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS;

          // same row → horizontal
          if (n.branch === n.parent.branch) {
            return (
              <line
                key={`edge-${n.parent?.depth}-${n.parent?.branch}-${n.depth}-${n.branch}`}
                x1={pCx + NODE_RADIUS}
                y1={pCy}
                x2={cCx - NODE_RADIUS}
                y2={cCy}
                stroke="black"
              />
            );
          }

          // branch below → elbow (down + horizontal)
          if (n.branch > n.parent.branch) {
            return (
              <polyline
                key={`edge-${n.parent?.depth}-${n.parent?.branch}-${n.depth}-${n.branch}`}
                points={`${pCx},${pCy + NODE_RADIUS} ${pCx},${cCy} ${cCx - NODE_RADIUS},${cCy}`}
                fill="none"
                stroke="black"
              />
            );
          }

          // branch above → horizontal at parent level
          return (
            <line
              key={`edge-${n.parent?.depth}-${n.parent?.branch}-${n.depth}-${n.branch}`}
              x1={pCx + NODE_RADIUS}
              y1={pCy}
              x2={cCx - NODE_RADIUS}
              y2={pCy}
              stroke="black"
            />
          );
        })}

        {/* nodo iniziale (cliccabile per tornare all'inizio) */}
        {(() => {
          const cx = TREE_MARGIN + NODE_RADIUS; // colonna 0
          const cy = TREE_MARGIN + root.branch * ROW_SPACING + NODE_RADIUS; // riga 0
          const selected = currentNode === root;
          return (
            <g
              key={`node-root`}
              transform={`translate(${cx},${cy})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setCurrentNode(root)}
            >
              {/* tooltip con eventuale commento */}
              {root.comment && <title>{root.comment}</title>}
              <circle
                r={NODE_RADIUS}
                fill="#f7f7f7"
                stroke={selected ? 'red' : 'black'}
                strokeWidth={selected ? 2 : 1}
              />
              <text y={4} textAnchor="middle" fontSize={14} fill="#333">
                0
              </text>
              {/* indicatore commento (pallino piccolo in alto‑destra) */}
              {root.comment && root.comment.trim() && (
                <circle
                  cx={NODE_RADIUS - 4}
                  cy={-(NODE_RADIUS - 4)}
                  r={3}
                  fill="#0ea5e9" /* sky-500 */
                  stroke="white"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })()}

        {/* nodes */}
        {nodes.map((n) => {
          const cx =
            TREE_MARGIN + (n.depth * COL_SPACING + extraCol) + NODE_RADIUS;
          const cy = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS;
          const selected = n === currentNode;
          const isBlack = n.player === 1;

          return (
            <g
              key={`node-${n.depth}-${n.branch}-${n.row}-${n.col}`}
              transform={`translate(${cx},${cy})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setCurrentNode(n)}
            >
              {/* tooltip con eventuale commento */}
              {n.comment && <title>{n.comment}</title>}
              <circle
                r={NODE_RADIUS}
                fill={isBlack ? 'black' : 'white'}
                stroke={selected ? 'red' : 'black'}
                strokeWidth={selected ? 2 : 1}
              />
              <text
                y={4}
                textAnchor="middle"
                fontSize={14}
                fill={isBlack ? 'white' : 'black'}
              >
                {n.depth + 1}
              </text>
              {/* indicatore commento (pallino piccolo in alto‑destra) */}
              {n.comment && n.comment.trim() && (
                <circle
                  cx={NODE_RADIUS - 4}
                  cy={-(NODE_RADIUS - 4)}
                  r={3}
                  fill="#0ea5e9" /* sky-500 */
                  stroke="white"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
