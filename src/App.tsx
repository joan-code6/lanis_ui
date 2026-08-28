import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CURRENT_ONBOARDING_VERSION, PreferencesProvider, usePreferences } from './contexts/PreferencesContext';
import Layout from './components/layout/Layout';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import Messages from './components/messages/Messages';
import Courses from './components/courses/Courses';
import Kalender from './components/calendar/Kalender';
import Profile from './components/profile/Profile';
import Settings from './components/settings/Settings';
import Dsbmobile from './components/dsb/Dsbmobile';
import DemoRoute from './components/demo/DemoRoute';
import Landingpage from './components/landing/Landingpage';
import Impressum from './components/legal/Impressum';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import Timetable from './components/timetable/Timetable';
import StudyGroups from './components/study-groups/StudyGroups';
import CustomBackend from './components/settings/CustomBackend';
import Onboarding from './components/onboarding/Onboarding';

const LandingRoot: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landingpage />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const PreferencesGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, isLoading } = usePreferences();
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600 dark:border-surface-800 dark:border-t-primary-400" />
      </div>
    );
  }
  const onboardingDone = preferences.onboarding.version >= CURRENT_ONBOARDING_VERSION
    && (preferences.onboarding.status === 'completed' || preferences.onboarding.status === 'skipped');
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingRoot />} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/set-custom-backend" element={<CustomBackend />} />
        <Route path="/demo" element={<DemoRoute />}>
          <Route index element={<Navigate to="/demo/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<Courses />} />
          <Route path="calendar" element={<Kalender />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="study-groups" element={<StudyGroups />} />
          <Route path="dsb" element={<Dsbmobile />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings/*" element={<Settings />} />
        </Route>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <PreferencesGate>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:id" element={<Courses />} />
                    <Route path="/calendar" element={<Kalender />} />
                    <Route path="/timetable" element={<Timetable />} />
                    <Route path="/study-groups" element={<StudyGroups />} />
                    <Route path="/dsb" element={<Dsbmobile />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings/*" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </PreferencesGate>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <PreferencesProvider>
            <AppRoutes />
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
