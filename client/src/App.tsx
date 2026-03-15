import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { BusinessUnitsPage } from './pages/BusinessUnitsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { RulesPage } from './pages/RulesPage';
import { RuleWizardPage } from './pages/RuleWizardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/templates/new" element={<TemplateEditorPage />} />
        <Route path="/templates/:id/edit" element={<TemplateEditorPage />} />
        <Route path="/business-units" element={<BusinessUnitsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/rules/new" element={<RuleWizardPage />} />
        <Route path="/rules/:id/edit" element={<RuleWizardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}