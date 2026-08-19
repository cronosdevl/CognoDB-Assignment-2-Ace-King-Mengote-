import type {
  Collaborator,
  ConnectionHop,
  ConnectionHopType,
  ConnectionPath,
  Paginated,
  PersonDetail,
  PersonSkill,
  PersonSummary,
  ProjectParticipation,
  CertificationRef,
} from '@wayfinder/shared';

import { AppError } from '../db/errors.js';
import { read, readOne } from '../db/query.js';
import {
  COUNT_PEOPLE,
  FIND_CONNECTION,
  GET_COLLABORATORS,
  GET_PERSON,
  GET_PERSON_SUMMARY,
  LIST_PEOPLE,
} from '../graph/cypher/people.js';
import { field, listField, optionalField, toNumber } from '../graph/mappers.js';

export interface ListPeopleOptions {
  q: string | null;
  skillId: string | null;
  teamId: string | null;
  roleId: string | null;
  openToMove: boolean | null;
  limit: number;
  offset: number;
}

export async function listPeople(options: ListPeopleOptions): Promise<Paginated<PersonSummary>> {
  const params = {
    q: options.q ? options.q.toLowerCase() : null,
    skillId: options.skillId,
    teamId: options.teamId,
    roleId: options.roleId,
    openToMove: options.openToMove,
    limit: options.limit,
    offset: options.offset,
  };

  const [items, totals] = await Promise.all([
    read(LIST_PEOPLE, params, (record) => field<PersonSummary>(record, 'person')),
    read(COUNT_PEOPLE, params, (record) => toNumber(record.get('total'))),
  ]);

  return { items, total: totals[0] ?? 0, limit: options.limit, offset: options.offset };
}

export async function getPerson(id: string): Promise<PersonDetail> {
  const [core, collaborators] = await Promise.all([
    readOne(GET_PERSON, { id }, (record) => ({
      person: field<PersonSummary>(record, 'person'),
      email: field<string>(record, 'email'),
      joinedAt: field<string>(record, 'joinedAt'),
      bio: field<string>(record, 'bio'),
      skills: listField<PersonSkill>(record, 'skills'),
      projects: listField<ProjectParticipation>(record, 'projects'),
      certifications: listField<CertificationRef>(record, 'certifications'),
      manager: optionalField<PersonSummary>(record, 'manager'),
      reports: listField<PersonSummary>(record, 'reports'),
      mentors: listField<PersonSummary>(record, 'mentors'),
      mentees: listField<PersonSummary>(record, 'mentees'),
    })),
    read(GET_COLLABORATORS, { id, limit: 12 }, (record) => ({
      ...field<PersonSummary>(record, 'person'),
      sharedProjects: toNumber(record.get('sharedProjects')),
      sharedProjectNames: listField<string>(record, 'sharedProjectNames'),
    })),
  ]);

  if (!core) throw AppError.notFound('Person', id);

  return {
    ...core.person,
    email: core.email,
    joinedAt: core.joinedAt,
    bio: core.bio,
    skills: [...core.skills].sort(
      (a, b) => b.level - a.level || b.endorsements - a.endorsements || a.name.localeCompare(b.name),
    ),
    projects: [...core.projects].sort(
      (a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name),
    ),
    certifications: core.certifications,
    manager: core.manager,
    reports: core.reports,
    mentors: core.mentors,
    mentees: core.mentees,
    collaborators: collaborators as Collaborator[],
  };
}

function statusRank(status: string): number {
  const order: Record<string, number> = { active: 0, planned: 1, paused: 2, completed: 3 };
  return order[status] ?? 9;
}

interface RawPathNode {
  labels: string[];
  id: string;
  name: string;
  title?: string;
  code?: string;
  seniority?: string;
  avatarHue?: number;
  openToMove?: boolean;
  tenureMonths?: number;
}

export async function findConnection(
  fromPersonId: string,
  toPersonId: string,
): Promise<ConnectionPath> {
  const [fromPerson, toPerson] = await Promise.all([getPersonSummary(fromPersonId), getPersonSummary(toPersonId)]);

  if (fromPersonId === toPersonId) {
    return { from: fromPerson, to: toPerson, hops: [], degrees: 0, found: true };
  }

  const result = await readOne(FIND_CONNECTION, { fromPersonId, toPersonId }, (record) => ({
    nodes: listField<RawPathNode>(record, 'pathNodes'),
    types: listField<string>(record, 'pathTypes'),
  }));

  if (!result || result.nodes.length === 0) {
    return { from: fromPerson, to: toPerson, hops: [], degrees: -1, found: false };
  }

  const hops: ConnectionHop[] = [];
  const { nodes, types } = result;

  let index = 0;
  let current = nodes[0];
  while (index < types.length) {
    const relType = types[index] as ConnectionHopType;
    const next = nodes[index + 1];
    if (!next || !current) break;

    if (next.labels.includes('Project')) {
      // Person -> Project -> Person collapses into one "shared project" hop.
      const after = nodes[index + 2];
      if (after) {
        hops.push({
          from: asSummary(current),
          to: asSummary(after),
          via: next.name,
          viaType: 'WORKED_ON',
        });
        current = after;
        index += 2;
        continue;
      }
    }

    hops.push({
      from: asSummary(current),
      to: asSummary(next),
      via: relType === 'MENTORS' ? 'Mentorship' : relType === 'REPORTS_TO' ? 'Reporting line' : relType,
      viaType: relType,
    });
    current = next;
    index += 1;
  }

  return { from: fromPerson, to: toPerson, hops, degrees: hops.length, found: true };
}

function asSummary(node: RawPathNode): PersonSummary {
  return {
    id: node.id,
    name: node.name,
    title: node.title ?? '',
    seniority: node.seniority ?? '',
    avatarHue: node.avatarHue ?? 210,
    openToMove: node.openToMove ?? false,
    tenureMonths: node.tenureMonths ?? 0,
    roleId: null,
    roleTitle: null,
    teamId: null,
    teamName: null,
    departmentName: null,
    locationId: null,
    locationLabel: null,
  };
}

export async function getPersonSummary(id: string): Promise<PersonSummary> {
  const person = await readOne(GET_PERSON_SUMMARY, { id }, (record) =>
    field<PersonSummary>(record, 'person'),
  );
  if (!person) throw AppError.notFound('Person', id);
  return person;
}
