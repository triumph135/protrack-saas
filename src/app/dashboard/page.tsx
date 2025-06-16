import React from 'react';
import DashboardView from '@/components/DashboardView';
import { useAppState } from '@/components/providers/AppStateProvider';

export default function DashboardPage() {
  const appState = useAppState();
  return <DashboardView {...appState} />;
} 