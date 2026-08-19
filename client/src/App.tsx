import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ConnectionsPage } from '@/features/connections/ConnectionsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { PathfinderPage } from '@/features/pathfinder/PathfinderPage';
import { PersonDetailPage } from '@/features/people/PersonDetailPage';
import { PeoplePage } from '@/features/people/PeoplePage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { RiskPage } from '@/features/risk/RiskPage';
import { SkillDetailPage } from '@/features/skills/SkillDetailPage';
import { SkillsPage } from '@/features/skills/SkillsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="pathfinder" element={<PathfinderPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="people/:id" element={<PersonDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="skills/:id" element={<SkillDetailPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="risk" element={<RiskPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
