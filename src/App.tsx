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
import { PlansPage } from './pages/PlansPage';
import { AboutPage } from './pages/AboutPage';
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignupDebugPanel } from './components/debug/SignupDebugPanel';

// Imports des nouvelles pages publiques
import SobrePage from './pages/SobrePage';
import PlanosPage from './pages/PlanosPage';
import TermosPage from './pages/TermosPage';
import PrivacidadePage from './pages/PrivacidadePage';
import ContatoPage from './pages/ContatoPage';
import VerifyOtpPage from './pages/verify-otp';

// Composant de mise en page pour les pages publiques
import LayoutPublic from './components/layout/LayoutPublic'; 

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Mise en page pour les routes publiques avec le pied de page inclus */}
          <Route path="/" element={<LayoutPublic />}>
            {/* Pages publiques accessibles à tous */}
            <Route index element={<LoginPage />} />
            <Route path="sobre" element={<SobrePage />} />
            <Route path="planos" element={<PlanosPage />} />
            <Route path="termos-de-uso" element={<TermosPage />} />
            <Route path="politica-de-privacidade" element={<PrivacidadePage />} />
            <Route path="contato" element={<ContatoPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="check-email" element={<CheckEmailPage />} />
            <Route path="verify" element={<VerifyEmailPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="request-password-reset" element={<RequestPasswordResetPage />} />
            <Route path="debug-auth" element={<DebugAuthPage />} />
            <Route path="update-password" element={<UpdatePasswordPage />} />
            <Route path="verify-otp" element={<VerifyOtpPage />} />
            <Route path="payment-success" element={<PaymentSuccessPage />} />
            <Route path="sucesso" element={<PaymentSuccessPage />} />
            <Route path="payment-cancel" element={<PaymentCancelPage />} />
            <Route path="cancelado" element={<PaymentCancelPage />} />
          </Route>

          {/* Rotas protégées (utilisant le Layout classique) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="classes/new" element={<ClassFormPage />} />
            <Route path="classes/:id/edit" element={<ClassFormPage />} />
            <Route path="classes/:classId/students" element={<StudentsPage />} />
            <Route path="students" element={<AllStudentsPage />} />
            <Route path="classes/:classId/students/new" element={<StudentFormPage />} />
            <Route path="classes/:classId/students/:id/edit" element={<StudentFormPage />} />
            <Route path="criteria" element={<CriteriaPage />} />
            <Route path="criteria/new" element={<CriteriaFormPage />} />
            <Route path="criteria/:id/edit" element={<CriteriaFormPage />} />
            <Route path="evaluation-titles" element={<EvaluationTitlesPage />} />
            <Route path="evaluation-criteria" element={<EvaluationCriteriaPage />} />
            <Route path="formatting" element={<ConditionalFormattingPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="evaluations/new" element={<EvaluationFormPage />} />
            <Route path="evaluations/:id/edit" element={<EvaluationFormPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>

          {/* Redirecionamento padrão pour n'importe quelle route non trouvée */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <SignupDebugPanel />
      </Router>
    </AuthProvider>
  );
};

export default App;
