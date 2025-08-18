import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CheckEmailPage } from './pages/CheckEmailPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RequestPasswordResetPage } from './pages/RequestPasswordResetPage';
import { DebugAuthPage } from './pages/DebugAuthPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';

import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';

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
import { EvaluationsPage } from './pages/EvaluationsPage';
import { EvaluationFormPage } from './pages/EvaluationFormPage';
import { ReportsPage } from './pages/ReportsPage';
import { ConditionalFormattingPage } from './pages/ConditionalFormattingPage';
import { PlansPage } from './pages/PlansPage';     // pages internes (connecté)
import { AboutPage } from './pages/AboutPage';     // pages internes (connecté)
import SettingsPage from './pages/SettingsPage';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignupDebugPanel } from './components/debug/SignupDebugPanel';

// PAGES PUBLIQUES (SEO / Footer)
import PublicAboutPage from './pages/SobrePage';
import PublicPlansPage from './pages/PlanosPage';
import PublicTermsPage from './pages/TermosPage';
import PublicPrivacyPage from './pages/PrivacidadePage';
import PublicContactPage from './pages/ContatoPage';

import VerifyOtpPage from './pages/verify-otp';
import LayoutPublic from './components/layout/LayoutPublic';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/*
            ----- PARTIE 1 : ROUTES PUBLIQUES (toujours accessibles) -----
            On les rend via LayoutPublic (header/footer public).
          */}
          <Route element={<LayoutPublic />}>
            {/* Auth & utilitaires */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
            <Route path="/debug-auth" element={<DebugAuthPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />

            {/* Stripe (pt/en) */}
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/sucesso" element={<PaymentSuccessPage />} />
            <Route path="/payment-cancel" element={<PaymentCancelPage />} />
            <Route path="/cancelado" element={<PaymentCancelPage />} />

            {/* Pages SEO / Footer — accessibles connecté ou non */}
            <Route path="/planos" element={<PublicPlansPage />} />
            <Route path="/sobre" element={<PublicAboutPage />} />
            <Route path="/termos" element={<PublicTermsPage />} />
            <Route path="/privacidade" element={<PublicPrivacyPage />} />
            <Route path="/contato" element={<PublicContactPage />} />
          </Route>

          {/*
            ----- PARTIE 2 : ROUTES PROTÉGÉES (app métier) -----
            Protégées via ProtectedRoute. Le Layout interne rend les sous-pages via <Outlet />.
            IMPORTANT : on NE redéclare PAS /termos /privacidade /contato ici
            pour éviter que le Layout privé n’écrase les pages publiques.
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
          </Route>

          {/* Catch-all : renvoie vers le dashboard (ProtectedRoute redirigera vers /login si non connecté) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Panneau de debug */}
        <SignupDebugPanel />
      </Router>
    </AuthProvider>
  );
};

export default App;
