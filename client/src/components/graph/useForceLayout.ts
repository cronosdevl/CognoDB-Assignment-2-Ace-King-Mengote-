import type { GraphEdge, GraphNode } from '@wayfinder/shared';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface PositionedNode extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  radius: number;
}

export interface PositionedEdge extends Omit<GraphEdge, 'source' | 'target'> {
  source: PositionedNode;
  target: PositionedNode;
}

function radiusFor(node: GraphNode): number {
  if (node.depth === 0) return 26;
  if (node.kind === 'project') return 16 + node.weight * 6;
  return 11 + node.weight * 9;
}

/**
 * Run a d3-force simulation to completion, then render once.
 *
 * Ticking into React state every frame would re-render the whole SVG sixty
 * times a second for no benefit — the layout is not interactive, it just needs
 * to settle. Running it synchronously off-screen and publishing the final
 * positions keeps the component cheap and the animation to a single CSS fade.
 */
export function useForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  const [layout, setLayout] = useState<{ nodes: PositionedNode[]; edges: PositionedEdge[] }>({
    nodes: [],
    edges: [],
  });
  const simulationRef = useRef<Simulation<PositionedNode, undefined> | null>(null);

  // Recompute only when the graph's shape actually changes, not on every
  // parent render (the payload object identity changes on each refetch).
  const signature = useMemo(
    () => `${nodes.map((n) => n.id).join(',')}|${edges.map((e) => e.id).join(',')}|${width}x${height}`,
    [nodes, edges, width, height],
  );

  useEffect(() => {
    if (nodes.length === 0 || width === 0 || height === 0) {
      setLayout({ nodes: [], edges: [] });
      return;
    }

    const simNodes: PositionedNode[] = nodes.map((node, index) => {
      // Seed positions on a ring so the first tick is not a random explosion;
      // the focus node starts pinned at the centre.
      const angle = (index / nodes.length) * Math.PI * 2;
      const spread = node.depth === 0 ? 0 : 80 + node.depth * 70;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * spread,
        y: height / 2 + Math.sin(angle) * spread,
        radius: radiusFor(node),
        ...(node.depth === 0 ? { fx: width / 2, fy: height / 2 } : {}),
      };
    });

    const byId = new Map(simNodes.map((node) => [node.id, node]));
    const simLinks = edges
      .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
      .map((edge) => ({ ...edge, source: byId.get(edge.source)!, target: byId.get(edge.target)! }));

    const simulation = forceSimulation<PositionedNode>(simNodes)
      .force(
        'link',
        forceLink<PositionedNode, SimulationLinkDatum<PositionedNode>>(
          simLinks as unknown as Array<SimulationLinkDatum<PositionedNode>>,
        )
          .id((node) => node.id)
          .distance((link) => {
            const target = link.target as PositionedNode;
            return target.kind === 'project' ? 92 : 74;
          })
          .strength(0.55),
      )
      .force('charge', forceManyBody<PositionedNode>().strength(-340).distanceMax(420))
      // Extra room around the focus node so its always-visible name label has
      // somewhere to sit without landing on a neighbour.
      .force(
        'collide',
        forceCollide<PositionedNode>((node) => node.radius + (node.depth === 0 ? 30 : 11)).strength(0.9),
      )
      .force('center', forceCenter(width / 2, height / 2).strength(0.06))
      .force('x', forceX<PositionedNode>(width / 2).strength(0.045))
      .force('y', forceY<PositionedNode>(height / 2).strength(0.06))
      .stop();

    simulationRef.current = simulation;

    // 320 ticks settles this graph size reliably and takes a few milliseconds.
    for (let i = 0; i < 320; i += 1) simulation.tick();

    const padding = 34;
    for (const node of simNodes) {
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }

    setLayout({
      nodes: simNodes,
      edges: simLinks as unknown as PositionedEdge[],
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
    // `signature` captures every input that should trigger a recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return layout;
}
