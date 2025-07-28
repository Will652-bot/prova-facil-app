import React from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

export default function TrialPlanBanner() {
  const { user } = useAuth();

  if (
    !user ||
    user.current_plan !== 'pro_trial' ||
    !user.pro_trial_enabled ||
    !user.pro_trial_start_date
  ) {
    return null;
  }

  const trialStart = dayjs(user.pro_trial_start_date);
  const daysElapsed = dayjs().diff(trialStart, 'day');
  const daysRemaining = Math.max(0, 15 - daysElapsed);

  if (daysRemaining <= 0) return null;

  return (
    <div className="border border-yellow-300 bg-yellow-50 text-yellow-900 rounded-xl px-5 py-4 flex items-start gap-4 shadow-sm">
      <div className="p-2 bg-yellow-200 rounded-full">
        <AlertTriangle className="h-6 w-6 text-yellow-800" />
      </div>
      <div>
        <p className="font-semibold text-yellow-800 text-sm sm:text-base">
          🎁 Teste gratuito do Plano Pro – {daysRemaining} dia(s) restante(s)
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          Você está aproveitando gratuitamente todas as funcionalidades do Plano Pro por 15 dias.
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          Explore os recursos avançados e decida se deseja assinar o plano ao final do período de teste.
        </p>
      </div>
    </div>
  );
}
