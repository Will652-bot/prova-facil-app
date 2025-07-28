import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TrialPlanBanner() {
  const { user } = useAuth();

  if (!user || user.current_plan !== 'pro_trial' || !user.pro_trial_enabled || !user.pro_trial_start_date) {
    return null; // N'affiche rien si l'utilisateur n'est pas en pro_trial actif
  }

  const trialStartDate = new Date(user.pro_trial_start_date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 15 - diffDays);

  return (
    <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 p-4 rounded-md mb-4">
      <p className="font-semibold text-yellow-800">Essai Pro en cours</p>
      <p className="text-sm mt-1">
        Vous bénéficiez actuellement d’un accès gratuit aux fonctionnalités du Plan Pro pour une durée de 15 jours.
      </p>
      <p className="text-sm mt-1">
        Il vous reste <span className="font-semibold">{daysRemaining} jour(s)</span> d’essai gratuit.
      </p>
    </div>
  );
}
