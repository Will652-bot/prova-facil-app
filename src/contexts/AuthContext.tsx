import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthState } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  const updateUserState = async (session: any) => {
    console.log('🔄 [AuthContext] updateUserState - Session:', !!session);

    if (session?.user) {
      try {
        let userData;

        // ✅ CORRECTION : Implémentation de la logique d'Exponential Backoff
        const fetchUserDataWithRetry = async (retryCount = 0): Promise<any> => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code === '429' && retryCount < 5) { // Limiter à 5 tentatives
            const delay = Math.pow(2, retryCount) * 100; // Délai exponentiel (100ms, 200ms, 400ms...)
            console.warn(`⚠️ Erreur 429 détectée. Retraite de ${delay}ms... (Tentative ${retryCount + 1})`);
            await new Promise(res => setTimeout(res, delay));
            return fetchUserDataWithRetry(retryCount + 1);
          }

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 = pas de lignes retournées

          return data;
        };

        const data = await fetchUserDataWithRetry();

        if (!data) {
          console.log('🆕 [AuthContext] Utilisateur non trouvé dans la table users, vérification du plan...');

          let initialPlan = 'free';
          try {
            const { data: prospects, error: prospectError } = await supabase
              .from('prospects')
              .select('email')
              .eq('email', session.user.email);

            const { count: totalProspects, error: countError } = await supabase
              .from('prospects')
              .select('*', { count: 'exact', head: true });

            if (prospectError || countError) {
              console.error('❌ Erreur lors de la vérification du plan:', prospectError || countError);
              initialPlan = 'free';
            } else {
              if (prospects && prospects.length > 0 && totalProspects !== null && totalProspects <= 100) {
                initialPlan = 'pro_trial';
                console.log('✅ Plan "pro_trial" attribué (limite non dépassée).');
              } else {
                initialPlan = 'free';
                console.log('✅ Plan "free" attribué (limite dépassée ou e-mail non prospect).');
              }
            }
          } catch (err) {
            console.error('❌ Exception lors de la vérification du plan:', err);
            initialPlan = 'free';
          }

          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              role: 'teacher',
              current_plan: initialPlan,
            })
            .select()
            .single();
          if (insertError) throw insertError;
          userData = insertData;
        } else {
          userData = data;
        }

        const trialDurationDays = 15;

        // ✅ Mise à jour vers pro_trial si éligible
        if (
          userData.pro_trial_enabled &&
          userData.current_plan === 'free' &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= trialDurationDays) {
            console.log(
              '⬆️ [AuthContext] Utilisateur éligible à l\'essai Pro. Mise à jour vers pro_trial...'
            );
            const { error: updateError } = await supabase
              .from('users')
              .update({ current_plan: 'pro_trial' })
              .eq('id', session.user.id);
            if (updateError) {
              console.error(
                '❌ [AuthContext] Erreur mise à jour pro_trial:',
                updateError.message
              );
            } else {
              userData.current_plan = 'pro_trial';
              console.log('✅ [AuthContext] Plan mis à jour vers pro_trial.');
            }
          } else {
            console.log('⏳ [AuthContext] Essai Pro expiré (utilisateur en plan free).');
          }
        }

        // 🔻 Rétrogradation si essai expiré
        else if (
          userData.current_plan === 'pro_trial' &&
          userData.pro_trial_enabled &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > trialDurationDays) {
            console.log('⬇️ [AuthContext] Essai expiré. Rétrogradation vers free...');
            const { error: downgradeError } = await supabase
              .from('users')
              .update({ current_plan: 'free' })
              .eq('id', session.user.id);
            if (downgradeError) {
              console.error(
                '❌ [AuthContext] Erreur rétrogradation plan expiré:',
                downgradeError.message
              );
            } else {
              userData.current_plan = 'free';
              console.log('✅ [AuthContext] Plan rétrogradé vers free.');
            }
          }
        }

        // ✅ Calcul du flag isProOrTrial
        let isProOrTrial = false;

        if (
          userData.pro_subscription_active ||
          userData.current_plan === 'pro'
        ) {
          isProOrTrial = true;
        } else if (
          userData.current_plan === 'pro_trial' &&
          userData.pro_trial_enabled &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= trialDurationDays) {
            isProOrTrial = true;
          }
        }

        const newUser: User = {
          ...session.user,
          role: userData.role,
          subscription_plan: userData.current_plan,
          full_name: userData.full_name,
          pro_subscription_active: userData.pro_subscription_active,
          subscription_expires_at: userData.subscription_expires_at,
          current_plan: userData.current_plan,
          pro_trial_start_date: userData.pro_trial_start_date,
          pro_trial_enabled: userData.pro_trial_enabled,
          isProOrTrial,
        };

        console.log(
          '✅ [AuthContext] Utilisateur mis à jour:',
          newUser.email,
          'Plan Pro/Trial:',
          newUser.isProOrTrial,
          'Current Plan DB:',
          newUser.current_plan
        );
        setState({ session, user: newUser, loading: false });
      } catch (error) {
        console.error('❌ [AuthContext] Exception mise à jour utilisateur:', error);
        setState({ session: null, user: null, loading: false });
      }
    } else {
      console.log('🧹 [AuthContext] Nettoyage état utilisateur');
      setState({ session: null, user: null, loading: false });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserState(session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 [AuthContext] AuthStateChange:', { event, hasSession: !!session });

          if (event === 'PASSWORD_RECOVERY') {
            console.log('🔄 [AuthContext] Événement PASSWORD_RECOVERY, pas de redirection.');
            await updateUserState(session);
            return;
          }

          if (event === 'SIGNED_IN') {
            await updateUserState(session);
            if (session && window.location.pathname === '/login') {
              window.location.replace('/dashboard');
            }
          }

          if (event === 'SIGNED_OUT') {
            setState({ session: null, user: null, loading: false });
            if (window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
          }
        }
      );

      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, loading: false });
    window.location.replace('/login');
  };

  const value = {
    user: state.user,
    loading: state.loading,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
