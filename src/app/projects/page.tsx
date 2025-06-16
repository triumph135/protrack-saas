import React from 'react';
import ProjectManagementView from '@/components/ProjectManagementView';
import { useAppState } from '@/components/providers/AppStateProvider';

export default function ProjectsPage() {
  const appState = useAppState();
  return <ProjectManagementView {...appState} />;
} 