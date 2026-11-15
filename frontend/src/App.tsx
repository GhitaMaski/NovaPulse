// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Activity } from 'lucide-react';

// Lazy-load routes as specified
const DashboardScreen = lazy(() =>
  import('./screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen }))
);
const CrewListScreen = lazy(() =>
  import('./screens/CrewListScreen').then((m) => ({ default: m.CrewListScreen }))
);
const AstronautDetailScreen = lazy(() =>
  import('./screens/AstronautDetailScreen').then((m) => ({ default: m.AstronautDetailScreen }))
);
const DataHistoryScreen = lazy(() =>
  import('./screens/DataHistoryScreen').then((m) => ({ default: m.DataHistoryScreen }))
);
const AnomalyDetectionScreen = lazy(() =>
  import('./screens/AnomalyDetectionScreen').then((m) => ({ default: m.AnomalyDetectionScreen }))
);
const RiskPredictionScreen = lazy(() =>
  import('./screens/RiskPredictionScreen').then((m) => ({ default: m.RiskPredictionScreen }))
);
const RecommendationsScreen = lazy(() =>
  import('./screens/RecommendationsScreen').then((m) => ({ default: m.RecommendationsScreen }))
);
const CrewAnalysisScreen = lazy(() =>
  import('./screens/CrewAnalysisScreen').then((m) => ({ default: m.CrewAnalysisScreen }))
);
const AlertsScreen = lazy(() =>
  import('./screens/AlertsScreen').then((m) => ({ default: m.AlertsScreen }))
);
const AlertDetailScreen = lazy(() =>
  import('./screens/AlertDetailScreen').then((m) => ({ default: m.AlertDetailScreen }))
);

const PageSkeleton: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-3" role="status" aria-label="Loading telemetry">
    <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/20 border border-[#2DD4BF]/40 flex items-center justify-center animate-pulse">
      <Activity className="w-5 h-5 text-[#2DD4BF]" />
    </div>
    <span className="text-xs font-mono text-[#9AA6BF] tracking-wider uppercase">
      Loading Telemetry Stream...
    </span>
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<PageSkeleton />}>
                <DashboardScreen />
              </Suspense>
            }
          />
          <Route
            path="crew"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <CrewListScreen />
              </Suspense>
            }
          />
          <Route
            path="crew/:crewId"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AstronautDetailScreen />
              </Suspense>
            }
          />
          <Route
            path="history"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <DataHistoryScreen />
              </Suspense>
            }
          />
          <Route
            path="anomalies"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AnomalyDetectionScreen />
              </Suspense>
            }
          />
          <Route
            path="risk"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <RiskPredictionScreen />
              </Suspense>
            }
          />
          <Route
            path="recommendations"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <RecommendationsScreen />
              </Suspense>
            }
          />
          <Route
            path="analysis"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <CrewAnalysisScreen />
              </Suspense>
            }
          />
          <Route
            path="alerts"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AlertsScreen />
              </Suspense>
            }
          />
          <Route
            path="alerts/:alertId"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AlertDetailScreen />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
