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
import { PlansPage } from './pages/PlansPage'; // PlansPage for authenticated users
import { AboutPage } from './pages/AboutPage'; // AboutPage for authenticated users
import SettingsPage from './pages/SettingsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignupDebugPanel } from './components/debug/SignupDebugPanel';

// IMPORTATION CORRIGÉE : Assurez-vous d'importer le bon composant OTP
// La capture d'écran a montré que VerifyOtpPage n'était pas défini.
// Cela est dû à un problème dans l'importation.
// Je vais supposer le nom de fichier correct, qui est généralement 'VerifyOtpPage' ou similaire.
import { VerifyOtpPage } from './pages/VerifyOtpPage';

// Importez les pages publiques pour le footer
import PublicPlansPage from './pages/PlanosPage'; // Public page for plans
import PublicAboutPage from './pages/SobrePage'; // Public page for about

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/*
            PARTIE 1 : Routes publiques.
            Elles sont définies en premier.
          */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
          <Route path="/debug-auth" element={<DebugAuthPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          {/* Remplacer par le composant corrigé */}
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/sucesso" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancel" element={<PaymentCancelPage />} />
          <Route path="/cancelado" element={<PaymentCancelPage />} />
          {/* Pages publiques pour le footer */}
          <Route path="/planos" element={<PublicPlansPage />} />
          <Route path="/sobre" element={<PublicAboutPage />} />

          {/*
            PARTIE 2 : Routes protégées.
            Toutes les pages métiers sont imbriquées dans un seul <Route> parent.
            Ce bloc est protégé par ProtectedRoute, qui vérifie l'authentification.
            Le <Layout /> rendra ensuite les pages métiers via <Outlet />.
          */}
          <Route
            path="/"
            element={<ProtectedRoute><Layout /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
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
            <Route path="settings" element={<SettingsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>

          {/* Redirection pour les routes non trouvées. */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <SignupDebugPanel />
      </Router>
    </AuthProvider>
  );
};

export default App;
