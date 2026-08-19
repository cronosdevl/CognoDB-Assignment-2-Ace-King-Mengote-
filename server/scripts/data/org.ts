import type { ProjectStatus, SkillLevel } from '@wayfinder/shared';

export interface DepartmentSeed {
  id: string;
  name: string;
}

export interface TeamSeed {
  id: string;
  name: string;
  departmentId: string;
  roleMix: string[];
}

export interface LocationSeed {
  id: string;
  city: string;
  country: string;
  timezone: string;
}

export interface CertificationSeed {
  id: string;
  name: string;
  issuer: string;
  certifies: string[];
}

export interface ProjectSeed {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  summary: string;
  businessUnit: string;
  requires: Array<[skillId: string, importance: number, minLevel: SkillLevel]>;
}


// Meridian Labs — a fictional ~180-person product company.

export const DEPARTMENTS: DepartmentSeed[] = [
  { id: 'dept-engineering', name: 'Engineering' },
  { id: 'dept-data-ai', name: 'Data & AI' },
  { id: 'dept-product', name: 'Product' },
  { id: 'dept-design', name: 'Design' },
  { id: 'dept-platform', name: 'Platform' },
  { id: 'dept-security', name: 'Security' },
];

export const TEAMS: TeamSeed[] = [
  { id: 'team-atlas', name: 'Atlas (Core Platform)', departmentId: 'dept-engineering', roleMix: ['swe', 'senior-swe', 'staff-engineer', 'junior-swe', 'engineering-manager'] },
  { id: 'team-orbit', name: 'Orbit (Web Experience)', departmentId: 'dept-engineering', roleMix: ['frontend-engineer', 'senior-frontend-engineer', 'swe', 'engineering-manager'] },
  { id: 'team-relay', name: 'Relay (Integrations)', departmentId: 'dept-engineering', roleMix: ['swe', 'senior-swe', 'junior-swe'] },
  { id: 'team-ledger', name: 'Ledger (Billing)', departmentId: 'dept-engineering', roleMix: ['senior-swe', 'swe', 'staff-engineer'] },
  { id: 'team-mobile', name: 'Kite (Mobile)', departmentId: 'dept-engineering', roleMix: ['frontend-engineer', 'swe', 'senior-frontend-engineer'] },

  { id: 'team-lighthouse', name: 'Lighthouse (Applied AI)', departmentId: 'dept-data-ai', roleMix: ['ai-research-engineer', 'ml-engineer', 'staff-ml-engineer', 'senior-data-scientist'] },
  { id: 'team-quarry', name: 'Quarry (Data Platform)', departmentId: 'dept-data-ai', roleMix: ['data-engineer', 'senior-data-engineer', 'analytics-engineer'] },
  { id: 'team-compass', name: 'Compass (Insights)', departmentId: 'dept-data-ai', roleMix: ['data-analyst', 'analytics-engineer', 'data-scientist'] },
  { id: 'team-signal', name: 'Signal (Risk & Fraud)', departmentId: 'dept-data-ai', roleMix: ['data-scientist', 'senior-data-scientist', 'ml-engineer'] },

  { id: 'team-product-core', name: 'Product — Core', departmentId: 'dept-product', roleMix: ['product-manager', 'senior-pm', 'associate-pm', 'group-pm'] },
  { id: 'team-product-growth', name: 'Product — Growth', departmentId: 'dept-product', roleMix: ['product-manager', 'senior-pm', 'associate-pm'] },
  { id: 'team-product-ai', name: 'Product — AI', departmentId: 'dept-product', roleMix: ['senior-pm', 'product-manager'] },

  { id: 'team-studio', name: 'Studio (Product Design)', departmentId: 'dept-design', roleMix: ['product-designer', 'senior-product-designer', 'design-lead'] },
  { id: 'team-canvas', name: 'Canvas (Design Systems)', departmentId: 'dept-design', roleMix: ['senior-product-designer', 'product-designer'] },

  { id: 'team-foundry', name: 'Foundry (Developer Platform)', departmentId: 'dept-platform', roleMix: ['platform-engineer', 'senior-platform-engineer', 'infrastructure-lead'] },
  { id: 'team-beacon', name: 'Beacon (Reliability)', departmentId: 'dept-platform', roleMix: ['sre', 'senior-platform-engineer', 'platform-engineer'] },
  { id: 'team-conduit', name: 'Conduit (Networking)', departmentId: 'dept-platform', roleMix: ['platform-engineer', 'sre'] },

  { id: 'team-bastion', name: 'Bastion (Product Security)', departmentId: 'dept-security', roleMix: ['security-engineer', 'senior-security-engineer', 'security-architect'] },
  { id: 'team-warden', name: 'Warden (Governance)', departmentId: 'dept-security', roleMix: ['security-engineer', 'senior-security-engineer'] },
];

export const LOCATIONS: LocationSeed[] = [
  { id: 'loc-bengaluru', city: 'Bengaluru', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'loc-hyderabad', city: 'Hyderabad', country: 'India', timezone: 'Asia/Kolkata' },
  { id: 'loc-london', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { id: 'loc-berlin', city: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
  { id: 'loc-amsterdam', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { id: 'loc-austin', city: 'Austin', country: 'United States', timezone: 'America/Chicago' },
  { id: 'loc-toronto', city: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
  { id: 'loc-singapore', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { id: 'loc-lisbon', city: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { id: 'loc-remote', city: 'Remote', country: 'Distributed', timezone: 'UTC' },
];

export const CERTIFICATIONS: CertificationSeed[] = [
  { id: 'cert-cka', name: 'Certified Kubernetes Administrator', issuer: 'CNCF', certifies: ['kubernetes', 'docker'] },
  { id: 'cert-aws-sa', name: 'AWS Solutions Architect — Professional', issuer: 'Amazon Web Services', certifies: ['aws', 'terraform'] },
  { id: 'cert-gcp-de', name: 'Professional Data Engineer', issuer: 'Google Cloud', certifies: ['gcp', 'etl'] },
  { id: 'cert-cissp', name: 'CISSP', issuer: 'ISC2', certifies: ['appsec', 'iam', 'compliance'] },
  { id: 'cert-oscp', name: 'OSCP', issuer: 'OffSec', certifies: ['appsec', 'threat-modelling'] },
  { id: 'cert-tf-assoc', name: 'Terraform Associate', issuer: 'HashiCorp', certifies: ['terraform'] },
  { id: 'cert-neo4j-pro', name: 'Graph Data Science Certified', issuer: 'Neo4j', certifies: ['cypher', 'data-modelling'] },
  { id: 'cert-cpacc', name: 'CPACC Accessibility', issuer: 'IAAP', certifies: ['accessibility'] },
  { id: 'cert-pmp', name: 'Professional Scrum Product Owner', issuer: 'Scrum.org', certifies: ['roadmapping', 'stakeholder-mgmt'] },
  { id: 'cert-dbt', name: 'dbt Analytics Engineering', issuer: 'dbt Labs', certifies: ['analytics-eng', 'sql'] },
];

export const PROJECTS: ProjectSeed[] = [
  {
    id: 'proj-atlas-rearchitecture',
    name: 'Atlas Re-architecture',
    code: 'ATL-1',
    status: 'active',
    summary: 'Split the core monolith into independently deployable services without a big-bang cutover.',
    businessUnit: 'Platform',
    requires: [['distributed-systems', 0.95, 4], ['refactoring', 0.9, 4], ['event-driven', 0.8, 3], ['typescript', 0.7, 3], ['testing', 0.7, 3], ['observability', 0.6, 3]],
  },
  {
    id: 'proj-copilot',
    name: 'Meridian Copilot',
    code: 'AI-7',
    status: 'active',
    summary: 'An in-product assistant that answers questions over customer data with citations.',
    businessUnit: 'AI',
    requires: [['llm-apps', 0.98, 4], ['vector-search', 0.9, 3], ['nlp', 0.8, 3], ['typescript', 0.6, 3], ['product-analytics', 0.5, 2], ['appsec', 0.6, 3]],
  },
  {
    id: 'proj-graph-recs',
    name: 'Graph-based Recommendations',
    code: 'REC-3',
    status: 'active',
    summary: 'Replace the collaborative-filtering recommender with a graph traversal model.',
    businessUnit: 'AI',
    requires: [['cypher', 0.95, 4], ['recsys', 0.9, 4], ['machine-learning', 0.8, 3], ['data-modelling', 0.7, 3], ['performance', 0.6, 3]],
  },
  {
    id: 'proj-billing-v2',
    name: 'Billing Engine v2',
    code: 'BIL-2',
    status: 'active',
    summary: 'Usage-based billing with a double-entry ledger and self-serve plan changes.',
    businessUnit: 'Commerce',
    requires: [['payments', 0.95, 4], ['sql', 0.8, 4], ['api-design', 0.8, 4], ['testing', 0.8, 4], ['pricing', 0.6, 3]],
  },
  {
    id: 'proj-fraud-graph',
    name: 'Fraud Ring Detection',
    code: 'FRD-1',
    status: 'active',
    summary: 'Detect coordinated fraud by finding dense subgraphs across accounts and devices.',
    businessUnit: 'Risk',
    requires: [['fraud', 0.95, 4], ['cypher', 0.85, 3], ['machine-learning', 0.8, 4], ['python', 0.7, 3], ['experimentation', 0.5, 3]],
  },
  {
    id: 'proj-design-system',
    name: 'Canvas Design System 3.0',
    code: 'DS-3',
    status: 'active',
    summary: 'A themeable component library shared by web and mobile, with accessibility built in.',
    businessUnit: 'Design',
    requires: [['design-systems', 0.98, 4], ['react', 0.85, 4], ['accessibility', 0.85, 4], ['visual-design', 0.7, 4], ['tech-writing', 0.5, 3]],
  },
  {
    id: 'proj-observability',
    name: 'Unified Observability',
    code: 'OBS-1',
    status: 'active',
    summary: 'One tracing and metrics pipeline across every service, with SLOs that mean something.',
    businessUnit: 'Platform',
    requires: [['observability', 0.95, 4], ['sre', 0.9, 4], ['kubernetes', 0.75, 3], ['go', 0.6, 3], ['cost-optimisation', 0.6, 3]],
  },
  {
    id: 'proj-zero-trust',
    name: 'Zero Trust Rollout',
    code: 'SEC-4',
    status: 'active',
    summary: 'Replace network-perimeter trust with per-request identity and policy.',
    businessUnit: 'Security',
    requires: [['iam', 0.95, 4], ['threat-modelling', 0.9, 4], ['networking', 0.8, 3], ['terraform', 0.7, 3], ['compliance', 0.6, 3]],
  },
  {
    id: 'proj-warehouse-migration',
    name: 'Warehouse Migration',
    code: 'DAT-5',
    status: 'active',
    summary: 'Move the analytics warehouse and rebuild the modelled layer with tests and lineage.',
    businessUnit: 'Data',
    requires: [['analytics-eng', 0.95, 4], ['sql', 0.9, 4], ['etl', 0.85, 4], ['data-modelling', 0.8, 4], ['spark', 0.6, 3]],
  },
  {
    id: 'proj-mobile-relaunch',
    name: 'Mobile Relaunch',
    code: 'KIT-2',
    status: 'active',
    summary: 'Rebuild the mobile app on a shared component layer with offline support.',
    businessUnit: 'Product',
    requires: [['mobile', 0.95, 4], ['react', 0.85, 4], ['typescript', 0.8, 3], ['interaction-design', 0.7, 3], ['performance', 0.6, 3]],
  },
  {
    id: 'proj-ml-platform',
    name: 'ML Serving Platform',
    code: 'MLP-1',
    status: 'active',
    summary: 'Standardised training, registry and low-latency serving for every model in production.',
    businessUnit: 'AI',
    requires: [['mlops', 0.98, 4], ['kubernetes', 0.85, 4], ['python', 0.8, 4], ['observability', 0.7, 3], ['distributed-systems', 0.7, 3]],
  },
  {
    id: 'proj-search-revamp',
    name: 'Semantic Search Revamp',
    code: 'SRCH-2',
    status: 'active',
    summary: 'Hybrid lexical and vector retrieval with relevance measured against a labelled set.',
    businessUnit: 'AI',
    requires: [['vector-search', 0.95, 4], ['nlp', 0.8, 3], ['performance', 0.7, 3], ['experimentation', 0.7, 3], ['python', 0.6, 3]],
  },
  {
    id: 'proj-onboarding',
    name: 'Self-Serve Onboarding',
    code: 'GRW-1',
    status: 'active',
    summary: 'Cut time-to-first-value for new accounts from days to under ten minutes.',
    businessUnit: 'Growth',
    requires: [['discovery', 0.9, 3], ['product-analytics', 0.85, 3], ['react', 0.75, 3], ['ux-writing', 0.7, 3], ['experimentation', 0.7, 3]],
  },
  {
    id: 'proj-cost-programme',
    name: 'Cloud Cost Programme',
    code: 'FIN-2',
    status: 'active',
    summary: 'Reduce infrastructure spend by 30% with no regression in SLOs.',
    businessUnit: 'Platform',
    requires: [['cost-optimisation', 0.95, 4], ['aws', 0.85, 4], ['kubernetes', 0.7, 3], ['observability', 0.6, 3]],
  },
  {
    id: 'proj-partner-api',
    name: 'Partner API Programme',
    code: 'REL-4',
    status: 'active',
    summary: 'A public, versioned API with sandbox, quotas and partner-facing documentation.',
    businessUnit: 'Platform',
    requires: [['api-design', 0.95, 4], ['graphql', 0.7, 3], ['tech-writing', 0.8, 3], ['iam', 0.7, 3], ['nodejs', 0.6, 3]],
  },
  {
    id: 'proj-supply-forecast',
    name: 'Demand Forecasting',
    code: 'SUP-1',
    status: 'active',
    summary: 'Forecast regional demand to drive inventory and staffing decisions.',
    businessUnit: 'Operations',
    requires: [['supply-chain', 0.9, 3], ['machine-learning', 0.85, 4], ['python', 0.8, 3], ['dataviz', 0.6, 3]],
  },
  {
    id: 'proj-accessibility-audit',
    name: 'Accessibility Remediation',
    code: 'A11Y-1',
    status: 'active',
    summary: 'Bring every customer-facing surface to WCAG 2.2 AA and keep it there.',
    businessUnit: 'Design',
    requires: [['accessibility', 0.98, 4], ['react', 0.7, 3], ['design-systems', 0.7, 3], ['tech-writing', 0.5, 2]],
  },
  {
    id: 'proj-incident-programme',
    name: 'Incident Response Overhaul',
    code: 'IR-1',
    status: 'active',
    summary: 'On-call rotation, severity model and blameless review process that people actually follow.',
    businessUnit: 'Platform',
    requires: [['incident-response', 0.95, 4], ['incident-command', 0.9, 4], ['sre', 0.8, 3], ['facilitation', 0.7, 3]],
  },
  {
    id: 'proj-healthcare-connector',
    name: 'Healthcare Connector',
    code: 'HLT-1',
    status: 'planned',
    summary: 'FHIR-based ingestion for healthcare customers, with PHI handling reviewed end to end.',
    businessUnit: 'Vertical',
    requires: [['healthcare-data', 0.98, 4], ['compliance', 0.85, 4], ['etl', 0.75, 3], ['appsec', 0.75, 4], ['api-design', 0.6, 3]],
  },
  {
    id: 'proj-marketplace',
    name: 'Partner Marketplace',
    code: 'MKT-1',
    status: 'planned',
    summary: 'A two-sided marketplace for third-party extensions, including revenue share.',
    businessUnit: 'Commerce',
    requires: [['marketplace', 0.95, 4], ['payments', 0.8, 3], ['pricing', 0.75, 3], ['api-design', 0.7, 3], ['discovery', 0.7, 3]],
  },
  {
    id: 'proj-graph-migration',
    name: 'Entity Graph Migration',
    code: 'GRA-1',
    status: 'planned',
    summary: 'Move the entity-relationship store off relational tables onto a property graph.',
    businessUnit: 'Data',
    requires: [['cypher', 0.98, 4], ['data-modelling', 0.9, 4], ['database-admin', 0.75, 3], ['performance', 0.7, 3], ['etl', 0.6, 3]],
  },
  {
    id: 'proj-realtime-events',
    name: 'Real-time Event Backbone',
    code: 'EVT-1',
    status: 'planned',
    summary: 'A durable event log every service can publish to and replay from.',
    businessUnit: 'Platform',
    requires: [['event-driven', 0.98, 4], ['distributed-systems', 0.9, 4], ['go', 0.7, 3], ['observability', 0.6, 3]],
  },
  {
    id: 'proj-pricing-experiment',
    name: 'Pricing Experimentation',
    code: 'PRC-1',
    status: 'planned',
    summary: 'Run controlled pricing experiments without breaking existing contracts.',
    businessUnit: 'Commerce',
    requires: [['pricing', 0.95, 4], ['experimentation', 0.9, 4], ['product-analytics', 0.8, 3], ['payments', 0.6, 3]],
  },
  {
    id: 'proj-soc2',
    name: 'SOC 2 Type II',
    code: 'CMP-1',
    status: 'active',
    summary: 'Controls, evidence collection and the audit itself.',
    businessUnit: 'Security',
    requires: [['compliance', 0.98, 4], ['iam', 0.8, 3], ['appsec', 0.7, 3], ['tech-writing', 0.6, 3]],
  },
  {
    id: 'proj-data-contracts',
    name: 'Data Contracts',
    code: 'DAT-8',
    status: 'planned',
    summary: 'Schema contracts between producers and consumers, enforced in CI.',
    businessUnit: 'Data',
    requires: [['data-modelling', 0.9, 4], ['analytics-eng', 0.85, 4], ['cicd', 0.7, 3], ['tech-writing', 0.6, 3]],
  },
  {
    id: 'proj-legacy-payments',
    name: 'Legacy Payments Retirement',
    code: 'BIL-9',
    status: 'completed',
    summary: 'Decommissioned the first-generation payment integration.',
    businessUnit: 'Commerce',
    requires: [['payments', 0.9, 3], ['refactoring', 0.85, 4], ['testing', 0.7, 3], ['sql', 0.6, 3]],
  },
  {
    id: 'proj-gdpr',
    name: 'Data Residency Programme',
    code: 'GOV-2',
    status: 'completed',
    summary: 'Regional data isolation and deletion guarantees for EU customers.',
    businessUnit: 'Security',
    requires: [['compliance', 0.9, 4], ['terraform', 0.75, 3], ['database-admin', 0.7, 3], ['iam', 0.6, 3]],
  },
  {
    id: 'proj-web-perf',
    name: 'Web Performance Sprint',
    code: 'ORB-6',
    status: 'completed',
    summary: 'Halved time-to-interactive on the three highest-traffic pages.',
    businessUnit: 'Product',
    requires: [['performance', 0.95, 4], ['react', 0.85, 4], ['observability', 0.6, 3]],
  },
  {
    id: 'proj-hiring-loop',
    name: 'Interview Loop Redesign',
    code: 'PPL-1',
    status: 'completed',
    summary: 'Structured, calibrated interviews with a shared rubric.',
    businessUnit: 'People',
    requires: [['hiring', 0.95, 4], ['facilitation', 0.8, 3], ['tech-writing', 0.6, 3]],
  },
  {
    id: 'proj-model-eval',
    name: 'Model Evaluation Harness',
    code: 'AI-11',
    status: 'paused',
    summary: 'Offline and online evaluation for every model before it reaches customers.',
    businessUnit: 'AI',
    requires: [['experimentation', 0.9, 4], ['llm-apps', 0.85, 3], ['mlops', 0.8, 3], ['python', 0.7, 3]],
  },
  {
    id: 'proj-logistics-routing',
    name: 'Routing Optimisation',
    code: 'LOG-3',
    status: 'paused',
    summary: 'Vehicle routing with time windows for the logistics vertical.',
    businessUnit: 'Vertical',
    requires: [['logistics', 0.95, 4], ['python', 0.8, 3], ['performance', 0.7, 3], ['dataviz', 0.5, 2]],
  },
  {
    id: 'proj-devex',
    name: 'Developer Experience Push',
    code: 'FND-2',
    status: 'active',
    summary: 'Cut local setup and CI feedback time so engineers stay in flow.',
    businessUnit: 'Platform',
    requires: [['cicd', 0.95, 4], ['docker', 0.85, 4], ['tech-writing', 0.7, 3], ['testing', 0.7, 3]],
  },
];
