import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import ProfileEditor from './pages/therapist/ProfileEditor';
import AvailabilityManager from './pages/therapist/AvailabilityManager';
import AppointmentsCalendar from './pages/therapist/AppointmentsCalendar';
import ClientList from './pages/therapist/ClientList';
import ClientProfile from './pages/therapist/ClientProfile';
import BillingManager from './pages/therapist/BillingManager';
import MessagesManager from './pages/therapist/MessagesManager';
import SubscriptionManager from './pages/therapist/SubscriptionManager';
import AnalyticsDashboard from './pages/therapist/AnalyticsDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import IntakeForm from './pages/client/IntakeForm';
import ClientNotesPortal from './pages/client/ClientNotesPortal';
import ClientChatPortal from './pages/client/ClientChatPortal';
import PublicProfile from './pages/client/PublicProfile';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Home */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Therapist Dashboard (Protected) */}
          <Route
            path="/dashboard"
            element={<Navigate to="/dashboard/profile" replace />}
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <ProfileEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/availability"
            element={
              <ProtectedRoute>
                <AvailabilityManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/clients"
            element={
              <ProtectedRoute>
                <ClientList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/clients/:id"
            element={
              <ProtectedRoute>
                <ClientProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/billing"
            element={
              <ProtectedRoute>
                <BillingManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages"
            element={
              <ProtectedRoute>
                <MessagesManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Platform Analytics Dashboard */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminDashboard />} />

          {/* Client Intake Form Submission */}
          <Route path="/intake/:clientId" element={<IntakeForm />} />

          {/* Client Portal: Shared Clinical Notes & Resources */}
          <Route path="/portal/:clientId/notes" element={<ClientNotesPortal />} />

          {/* Client Portal: Direct Chat with Therapist */}
          <Route path="/portal/:clientId/chat" element={<ClientChatPortal />} />

          {/* Public Branded Therapist Website Slug (e.g. /dr-ananya-sharma) */}
          <Route path="/:slug" element={<PublicProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
