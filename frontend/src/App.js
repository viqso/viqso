import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import LoginPage from "./pages/Login";
import DashboardLayout from "./layout/DashboardLayout";
import DashboardPage from "./pages/Dashboard";
import BoothsPage from "./pages/Booths";
import BoothDetailPage from "./pages/BoothDetail";
import VotersPage from "./pages/Voters";
import SurveyFormPage from "./pages/SurveyForm";
import AnalyticsPage from "./pages/Analytics";
import AdminPage from "./pages/Admin";
import VisitsPage from "./pages/Visits";
import SegregatePage from "./pages/Segregate";
import FamiliesPage from "./pages/Families";
import ImportPage from "./pages/Import";
import SuperAdminPage from "./pages/SuperAdmin";
import VoterSlipPage from "./pages/VoterSlip";
import WarRoomPage from "./pages/WarRoom";
import AuditLogsPage from "./pages/AuditLogs";
import PollingDayPage from "./pages/PollingDay";
import BroadcastPage from "./pages/Broadcast";
import BulkPrintSlipsPage from "./pages/BulkPrintSlips";

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="font-display text-2xl font-semibold text-slate-900">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <SettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster richColors position="top-right" />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/super-admin" element={<SuperAdminPage />} />
              <Route path="/slip/:id" element={
                <ProtectedRoute>
                  <VoterSlipPage />
                </ProtectedRoute>
              } />
              <Route path="/booths/:boothId/bulk-slips" element={
                <ProtectedRoute>
                  <BulkPrintSlipsPage />
                </ProtectedRoute>
              } />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="booths" element={<BoothsPage />} />
                <Route path="booths/:id" element={<BoothDetailPage />} />
                <Route path="voters" element={<VotersPage />} />
                <Route path="survey/new" element={<SurveyFormPage />} />
                <Route path="survey/:id/edit" element={<SurveyFormPage />} />
                <Route path="visits" element={<VisitsPage />} />
                <Route path="segregate" element={<SegregatePage />} />
                <Route path="families" element={<FamiliesPage />} />
                <Route path="polling-day" element={<PollingDayPage />} />
                <Route path="broadcast" element={<BroadcastPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route
                  path="war-room"
                  element={
                    <ProtectedRoute roles={["admin", "campaign_manager", "supervisor"]}>
                      <WarRoomPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute roles={["admin", "campaign_manager"]}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="import"
                  element={
                    <ProtectedRoute roles={["admin", "supervisor"]}>
                      <ImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </div>
  );
}

export default App;
