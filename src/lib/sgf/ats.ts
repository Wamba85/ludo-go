export type SgfProp = { id: string; values: string[] };

export type SgfNode = {
  /** Ordine preservato per round-trip fedele */
  props: SgfProp[];
};

export type SgfTree = {
  nodes: SgfNode[]; // RootNode = nodes[0]
  children: SgfTree[]; // variazioni (Tail)
};

export type SgfCollection = { trees: SgfTree[] };
