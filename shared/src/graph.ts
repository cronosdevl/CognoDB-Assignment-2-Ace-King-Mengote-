/** Payloads for the interactive graph visualisations. */

export const GRAPH_NODE_KINDS = ['person', 'skill', 'project', 'role', 'team'] as const;
export type GraphNodeKind = (typeof GRAPH_NODE_KINDS)[number];

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  /** Secondary line rendered under the label in tooltips and detail cards. */
  sublabel?: string;
  /** Relative importance, drives node radius. Normalised 0–1 by the client. */
  weight: number;
  /** Hops from the graph's focus node; 0 is the focus itself. */
  depth: number;
  /** Route the client should navigate to when the node is opened. */
  href?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  /** Relative strength, drives stroke width. */
  weight: number;
}

export interface GraphPayload {
  focusId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** True when the neighbourhood was clipped to stay renderable. */
  truncated: boolean;
}
