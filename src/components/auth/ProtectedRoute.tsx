import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Affiche un état de chargement pendant que le contexte vérifie l'authentification
  // C'est la correction clé : on ne redirige pas tant que le chargement est en cours.
  if (loading) {
    console.log('[ProtectedRoute] État de chargement. Attente de la session.');
    return null; // Affiche une page blanche pour éviter le "flash" de contenu non autorisé
  }

  // Si le chargement est terminé et que l'utilisateur N'EST PAS authentifié,
  // on le redirige vers la page de connexion.
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Utilisateur non authentifié. Redirection vers /login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur est authentifié, on affiche la page demandée.
  return <>{children}</>;
};
