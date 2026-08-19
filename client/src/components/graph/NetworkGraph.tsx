import type { GraphNodeKind, GraphPayload } from '@wayfinder/shared';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useForceLayout, type PositionedNode } from '@/components/graph/useForceLayout';
import { useTheme } from '@/components/providers/ThemeProvider';
import { initials } from '@/lib/color';

const KIND_HUES: Record<GraphNodeKind, number> = {
  person: 275,
  project: 200,
  skill: 300,
  role: 155,
  team: 75,
};

function nodeFill(kind: GraphNodeKind, isFocus: boolean, isDark: boolean): string {
  const hue = KIND_HUES[kind];
  if (isFocus) return `oklch(${isDark ? '68%' : '56%'} 0.17 ${hue})`;
  return isDark ? `oklch(46% 0.09 ${hue})` : `oklch(88% 0.07 ${hue})`;
}

function nodeText(kind: GraphNodeKind, isFocus: boolean, isDark: boolean): string {
  if (isFocus) return '#fff';
  const hue = KIND_HUES[kind];
  return isDark ? `oklch(92% 0.05 ${hue})` : `oklch(38% 0.14 ${hue})`;
}

/**
 * The ego network, drawn as SVG.
 *
 * SVG rather than canvas because the graph is small (a few dozen nodes), and
 * SVG gives real DOM nodes — so each one can be focused with a keyboard,
 * announced by a screen reader and navigated with Enter, which a canvas
 * would have to reimplement from scratch.
 */
export function NetworkGraph({ payload, height = 460 }: { payload: GraphPayload; height?: number }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { nodes, edges } = useForceLayout(payload.nodes, payload.edges, width, height);

  const activeNode = hovered ? nodes.find((node) => node.id === hovered) : null;
  const connectedIds = new Set<string>();
  if (activeNode) {
    connectedIds.add(activeNode.id);
    for (const edge of edges) {
      if (edge.source.id === activeNode.id) connectedIds.add(edge.target.id);
      if (edge.target.id === activeNode.id) connectedIds.add(edge.source.id);
    }
  }

  const open = (node: PositionedNode) => {
    if (node.href) navigate(node.href);
  };

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width || 100}
        height={height}
        viewBox={`0 0 ${width || 100} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Collaboration network with ${payload.nodes.length} nodes and ${payload.edges.length} connections`}
      >
        <g>
          {edges.map((edge) => {
            const dimmed = activeNode !== null && !(connectedIds.has(edge.source.id) && connectedIds.has(edge.target.id));
            const isMentorship = edge.type === 'MENTORS';
            return (
              <line
                key={edge.id}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={
                  isMentorship
                    ? isDark
                      ? 'oklch(62% 0.13 155)'
                      : 'oklch(60% 0.13 155)'
                    : 'var(--color-border-strong)'
                }
                strokeWidth={isMentorship ? 1.8 : 1 + edge.weight}
                strokeDasharray={isMentorship ? '4 3' : undefined}
                strokeOpacity={dimmed ? 0.12 : isMentorship ? 0.85 : 0.5}
                className="transition-[stroke-opacity] duration-200"
              />
            );
          })}
        </g>

        <g>
          {nodes.map((node) => {
            const isFocus = node.depth === 0;
            const dimmed = activeNode !== null && !connectedIds.has(node.id);
            const isProject = node.kind === 'project';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer transition-opacity duration-200 focus:outline-none"
                opacity={dimmed ? 0.25 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${node.label}${node.sublabel ? `, ${node.sublabel}` : ''}`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                onClick={() => open(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open(node);
                  }
                }}
              >
                {isProject ? (
                  <rect
                    x={-node.radius}
                    y={-node.radius * 0.7}
                    width={node.radius * 2}
                    height={node.radius * 1.4}
                    rx={5}
                    fill={nodeFill(node.kind, isFocus, isDark)}
                    stroke={hovered === node.id ? 'var(--color-accent)' : 'var(--color-surface)'}
                    strokeWidth={hovered === node.id ? 2.5 : 1.5}
                  />
                ) : (
                  <circle
                    r={node.radius}
                    fill={nodeFill(node.kind, isFocus, isDark)}
                    stroke={hovered === node.id ? 'var(--color-accent)' : 'var(--color-surface)'}
                    strokeWidth={hovered === node.id ? 2.5 : 1.5}
                  />
                )}

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isFocus ? 12 : isProject ? 9 : 10}
                  fontWeight={600}
                  fill={nodeText(node.kind, isFocus, isDark)}
                  className="pointer-events-none select-none"
                >
                  {isProject ? node.sublabel : initials(node.label)}
                </text>

                {/* Names only on the focus node and whatever is hovered — otherwise
                    the labels collide and the picture becomes unreadable. */}
                {isFocus || hovered === node.id ? (
                  <text
                    y={node.radius + 15}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--color-ink)"
                    // A halo in the surface colour keeps the name readable even
                    // when the layout drops it across a neighbouring node.
                    stroke="var(--color-surface)"
                    strokeWidth={3.5}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    className="pointer-events-none select-none"
                  >
                    {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: nodeFill('person', true, isDark) }}
          />
          Focus
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: nodeFill('person', false, isDark) }}
          />
          Colleague
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3.5 rounded-[2px]" style={{ backgroundColor: nodeFill('project', false, isDark) }} />
          Project
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke="oklch(60% 0.13 155)" strokeWidth="1.8" strokeDasharray="4 3" />
          </svg>
          Mentorship
        </span>
        {payload.truncated ? (
          <span className="text-[var(--color-ink-faint)]">Showing the closest collaborators only</span>
        ) : null}
      </div>
    </div>
  );
}
