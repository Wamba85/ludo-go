/**
 * Shared numeric constants used by the Goban components.
 * Centralising these values avoids scattering “magic numbers”
 * all over the code‑base and makes tweaking the UI much easier.
 */

/* Default board size */
export const BOARD_SIZE_DEFAULT = 19;

/* Goban drawing (px) */
export const CELL_SIZE = 40; // distance between grid lines
export const MARGIN = 60; // padding around the board

/* Move‑tree drawing (px) */
export const NODE_RADIUS = 15; // stone radius in the tree
export const COL_SPACING = 70; // horizontal distance between columns (depth)
export const ROW_SPACING = 50; // vertical distance between branches
export const TREE_MARGIN = 20; // padding around the tree SVG
