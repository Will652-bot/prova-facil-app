// src/components/LayoutPrivate.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar'; // Assurez-vous d'importer votre composant de barre de navigation

const LayoutPrivate = () => {
  const { user, loading } = useAuth(); // Votre contexte d'authentification

  if (loading) {
    return <div>Chargement...</div>; // Affichez un loader pendant que le contexte charge l'utilisateur
  }

  // Si l'utilisateur n'est pas authentifié, on redirige vers la page de connexion
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si l'utilisateur est authentifié, on affiche le layout privé et le contenu de la route
  return (
    <>
      <Navbar /> {/* Incluez votre barre de navigation ici */}
      <main>
        <Outlet /> {/* Les pages métiers (étudiants, classes, etc.) seront affichées ici */}
      </main>
    </>
  );
};

export default LayoutPrivate;
