import type {
  AdjacentSkill,
  Paginated,
  PersonSummary,
  SkillDetail,
  SkillHolder,
  SkillSummary,
} from '@wayfinder/shared';

import { AppError } from '../db/errors.js';
import { read, readOne } from '../db/query.js';
import {
  COUNT_SKILLS,
  GET_SKILL,
  LIST_SKILLS,
  LIST_SKILL_CATEGORIES,
  SKILL_HOLDERS,
} from '../graph/cypher/skills.js';
import { field, listField, round, toNumber, uniqueBy } from '../graph/mappers.js';

export interface ListSkillsOptions {
  q: string | null;
  category: string | null;
  limit: number;
  offset: number;
}

export async function listSkills(options: ListSkillsOptions): Promise<Paginated<SkillSummary>> {
  const params = {
    q: options.q ? options.q.toLowerCase() : null,
    category: options.category,
    limit: options.limit,
    offset: options.offset,
  };

  const [items, totals] = await Promise.all([
    read(LIST_SKILLS, params, (record) => {
      const skill = field<SkillSummary>(record, 'skill');
      return { ...skill, averageLevel: round(skill.averageLevel, 2) };
    }),
    read(COUNT_SKILLS, params, (record) => toNumber(record.get('total'))),
  ]);

  return { items, total: totals[0] ?? 0, limit: options.limit, offset: options.offset };
}

export async function listCategories(): Promise<string[]> {
  return read(LIST_SKILL_CATEGORIES, {}, (record) => field<string>(record, 'category'));
}

export async function getSkill(id: string): Promise<SkillDetail> {
  const [core, holders] = await Promise.all([
    readOne(GET_SKILL, { id }, (record) => ({
      id: field<string>(record, 'id'),
      name: field<string>(record, 'name'),
      category: field<SkillSummary['category']>(record, 'category'),
      description: field<string>(record, 'description'),
      holders: toNumber(record.get('holders')),
      experts: toNumber(record.get('experts')),
      demandedBy: toNumber(record.get('demandedBy')),
      averageLevel: round(toNumber(record.get('averageLevel')), 2),
      levelDistribution: listField<SkillDetail['levelDistribution'][number]>(record, 'levelDistribution'),
      adjacent: listField<AdjacentSkill>(record, 'adjacent'),
      requiredByProjects: listField<SkillDetail['requiredByProjects'][number]>(record, 'requiredByProjects'),
      requiredByRoles: listField<SkillDetail['requiredByRoles'][number]>(record, 'requiredByRoles'),
    })),
    read(SKILL_HOLDERS, { id, limit: 12 }, (record) => ({
      ...field<PersonSummary>(record, 'person'),
      level: toNumber(record.get('level')) as SkillHolder['level'],
      endorsements: toNumber(record.get('endorsements')),
      lastUsedAt: record.get('lastUsedAt') as string | null,
    })),
  ]);

  if (!core) throw AppError.notFound('Skill', id);

  return {
    ...core,
    adjacent: uniqueBy(core.adjacent, (skill) => skill.id).sort((a, b) => b.similarity - a.similarity),
    requiredByProjects: [...core.requiredByProjects].sort((a, b) => b.importance - a.importance),
    requiredByRoles: [...core.requiredByRoles].sort((a, b) => a.title.localeCompare(b.title)),
    topHolders: holders,
  };
}
