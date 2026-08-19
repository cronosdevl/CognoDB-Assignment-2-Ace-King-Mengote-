import type { GraphEdge, GraphNode, GraphPayload, PersonSummary } from '@wayfinder/shared';

import { readOne } from '../db/query.js';
import { PERSON_NETWORK } from '../graph/cypher/people.js';
import { field, listField, uniqueBy } from '../graph/mappers.js';

interface ProjectRef {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface Membership {
  personId: string;
  projectId: string;
}

const MAX_PEERS = 24;

export async function getPersonGraph(personId: string): Promise<GraphPayload> {
  const result = await readOne(
    PERSON_NETWORK,
    { id: personId, highlightSkillIds: [] },
    (record) => ({
      focus: field<PersonSummary>(record, 'focus'),
      projects: listField<ProjectRef>(record, 'projects'),
      peers: listField<PersonSummary>(record, 'peers'),
      mentors: listField<PersonSummary>(record, 'mentors'),
      mentees: listField<PersonSummary>(record, 'mentees'),
      memberships: listField<Membership>(record, 'memberships'),
    }),
  );

  if (!result) {
    return { focusId: personId, nodes: [], edges: [], truncated: false };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  nodes.push({
    id: result.focus.id,
    label: result.focus.name,
    kind: 'person',
    sublabel: result.focus.title,
    weight: 1,
    depth: 0,
    href: `/people/${result.focus.id}`,
  });

  for (const project of result.projects) {
    nodes.push({
      id: project.id,
      label: project.name,
      kind: 'project',
      sublabel: project.code,
      weight: 0.7,
      depth: 1,
      href: `/projects/${project.id}`,
    });
    edges.push({
      id: `${result.focus.id}--${project.id}`,
      source: result.focus.id,
      target: project.id,
      type: 'WORKED_ON',
      weight: 1,
    });
  }

  const peerCounts = new Map<string, number>();
  for (const peer of result.peers) {
    peerCounts.set(peer.id, (peerCounts.get(peer.id) ?? 0) + 1);
  }

  const peers = uniqueBy(result.peers, (peer) => peer.id).sort(
    (a, b) => (peerCounts.get(b.id) ?? 0) - (peerCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );
  const visiblePeers = peers.slice(0, MAX_PEERS);
  const visiblePeerIds = new Set(visiblePeers.map((peer) => peer.id));

  for (const peer of visiblePeers) {
    const shared = peerCounts.get(peer.id) ?? 1;
    nodes.push({
      id: peer.id,
      label: peer.name,
      kind: 'person',
      sublabel: peer.title,
      weight: Math.min(1, 0.35 + shared * 0.15),
      depth: 2,
      href: `/people/${peer.id}`,
    });
  }

  const projectIds = new Set(result.projects.map((project) => project.id));
  for (const membership of result.memberships) {
    if (!visiblePeerIds.has(membership.personId) || !projectIds.has(membership.projectId)) continue;
    edges.push({
      id: `${membership.personId}--${membership.projectId}`,
      source: membership.personId,
      target: membership.projectId,
      type: 'WORKED_ON',
      weight: 0.5,
    });
  }

  for (const mentor of result.mentors) {
    if (!visiblePeerIds.has(mentor.id)) {
      nodes.push({
        id: mentor.id,
        label: mentor.name,
        kind: 'person',
        sublabel: mentor.title,
        weight: 0.6,
        depth: 1,
        href: `/people/${mentor.id}`,
      });
      visiblePeerIds.add(mentor.id);
    }
    edges.push({
      id: `${mentor.id}--mentors--${result.focus.id}`,
      source: mentor.id,
      target: result.focus.id,
      type: 'MENTORS',
      label: 'mentors',
      weight: 0.9,
    });
  }

  for (const mentee of result.mentees) {
    if (!visiblePeerIds.has(mentee.id)) {
      nodes.push({
        id: mentee.id,
        label: mentee.name,
        kind: 'person',
        sublabel: mentee.title,
        weight: 0.6,
        depth: 1,
        href: `/people/${mentee.id}`,
      });
      visiblePeerIds.add(mentee.id);
    }
    edges.push({
      id: `${result.focus.id}--mentors--${mentee.id}`,
      source: result.focus.id,
      target: mentee.id,
      type: 'MENTORS',
      label: 'mentors',
      weight: 0.9,
    });
  }

  return {
    focusId: result.focus.id,
    nodes: uniqueBy(nodes, (node) => node.id),
    edges: uniqueBy(edges, (edge) => edge.id),
    truncated: peers.length > MAX_PEERS,
  };
}
