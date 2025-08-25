import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';

// Auth & utilitaires (public)
import LoginPage from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CheckEmailPage } from './pages/CheckEmailPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RequestPasswordResetPage } from './pages/RequestPasswordResetPage';
import { DebugAuthPage } from './pages/DebugAuthPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import VerifyOtpPage from './pages/verify-otp';

// Stripe redirects (public)
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';

// Layout privé + routes métier
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ClassesPage } from './pages/ClassesPage';
import { ClassFormPage } from './pages/ClassFormPage';
import { StudentsPage } from './pages/StudentsPage';
import { AllStudentsPage } from './pages/AllStudentsPage';
import { StudentFormPage } from './pages/StudentFormPage';
import { CriteriaPage } from './pages/CriteriaPage';
import { CriteriaFormPage } from './pages/CriteriaFormPage';
import { EvaluationTitlesPage } from './pages/EvaluationTitlesPage';
import { EvaluationCriteriaPage } from './pages/EvaluationCriteriaPage';
import EvaluationsPage from './pages/EvaluationsPage';
import { EvaluationFormPage } from './pages/EvaluationFormPage';
import { ReportsPage } from './pages/ReportsPage';
import { ConditionalFormattingPage } from './pages/ConditionalFormattingPage';
import { PlansPage } from './pages/PlansPage';
import { AboutPage } from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';

// Garde d’auth
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Debug
import { SignupDebugPanel } from './components/debug/SignupDebugPanel';

// Layout public + pages SEO (footer)
import LayoutPublic from './components/layout/LayoutPublic';
import PublicAboutPage from './pages/SobrePage';
import PublicPlansPage from './pages/PlanosPage';
import PublicTermsPage from './pages/TermosPage';
import PublicPrivacyPage from './pages/PrivacidadePage';
import PublicContactPage from './pages/ContatoPage';

// Pages pour les utilisateurs connectés (versions authentifiées)
import TermosPageAuthenticated from './pages/authenticated/TermosPage';
import PrivacidadePageAuthenticated from './pages/authenticated/PrivacidadePage';
import ContatoPageAuthenticated from './pages/authenticated/ContatoPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/*
            ===== PARTIE 1 — ROUTES PUBLIQUES (ACCESSIBLES MÊME SI L'UTILISATEUR EST CONNECTÉ) =====
            - Servies via LayoutPublic (navbar/footer public)
          */}
          <Route element={<LayoutPublic />}>
            {/* Auth publiques */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/verify" element={<VerifyEmailPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
            <Route path="/debug-auth" element={<DebugAuthPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />

            {/* Stripe */}
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/sucesso" element={<PaymentSuccessPage />} />
            <Route path="/payment-cancel" element={<PaymentCancelPage />} />
            <Route path="/cancelado" element={<PaymentCancelPage />} />

            {/* Pages SEO / Footer — toujours accessibles (versions publiques) */}
            <Route path="/planos" element={<PublicPlansPage />} />
            <Route path="/sobre" element={<PublicAboutPage />} />
            <Route path="/termos" element={<PublicTermsPage />} />
            <Route path="/privacidade" element={<PublicPrivacyPage />} />
            <Route path="/contato" element={<PublicContactPage />} />
          </Route>

          {/*
            ===== PARTIE 2 — ROUTES PROTÉGÉES (NÉCESSITENT L'AUTHENTIFICATION) =====
            - Servies via Layout (navbar/footer privés) et <Outlet />
          */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Turmas / Alunos */}
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/new" element={<ClassFormPage />} />
            <Route path="classes/:id/edit" element={<ClassFormPage />} />
            <Route path="classes/:classId/students" element={<StudentsPage />} />
            <Route path="students" element={<AllStudentsPage />} />
            <Route path="classes/:classId/students/new" element={<StudentFormPage />} />
            <Route path="classes/:classId/students/:id/edit" element={<StudentFormPage />} />

            {/* Critérios */}
            <Route path="criteria" element={<CriteriaPage />} />
            <Route path="criteria/new" element={<CriteriaFormPage />} />
            <Route path="criteria/:id/edit" element={<CriteriaFormPage />} />

            {/* Avaliações */}
            <Route path="evaluation-titles" element={<EvaluationTitlesPage />} />
            <Route path="evaluation-criteria" element={<EvaluationCriteriaPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="evaluations/new" element={<EvaluationFormPage />} />
            <Route path="evaluations/:id/edit" element={<EvaluationFormPage />} />

            {/* Divers */}
            <Route path="formatting" element={<ConditionalFormattingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="about" element={<AboutPage />} />
            
            {/* Pages du footer pour le mode connecté (versions authentifiées) */}
            <Route path="termos" element={<TermosPageAuthenticated />} />
            <Route path="privacidade" element={<PrivacidadePageAuthenticated />} />
            <Route path="contato" element={<ContatoPageAuthenticated />} />
          </Route>

          {/* Catch-all : vers /dashboard ; si non connecté, ProtectedRoute renverra /login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Debug panel global */}
        <SignupDebugPanel />
      </Router>
    </AuthProvider>
  );
};

export default App;
