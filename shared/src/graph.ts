/** Payloads for the interactive graph visualisations. */

export const GRAPH_NODE_KINDS = ['person', 'skill', 'project', 'role', 'team'] as const;
export type GraphNodeKind = (typeof GRAPH_NODE_KINDS)[number];

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  sublabel?: string;
  weight: number;
  depth: number;
  href?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  weight: number;
}

export interface GraphPayload {
  focusId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}
