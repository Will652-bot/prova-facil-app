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

        const fetchUserDataWithRetry = async (retryCount = 0): Promise<any> => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.code === '429' && retryCount < 5) {
            const delay = Math.pow(2, retryCount) * 100;
            console.warn(`⚠️ Erreur 429 détectée. Retraite de ${delay}ms... (Tentative ${retryCount + 1})`);
            await new Promise(res => setTimeout(res, delay));
            return fetchUserDataWithRetry(retryCount + 1);
          }

          if (error && error.code !== 'PGRST116') throw error;
          return data;
        };

        const data = await fetchUserDataWithRetry();

        if (!data) {
          console.log('🆕 [AuthContext] Utilisateur non trouvé dans la table users, vérification du plan...');

          let initialPlan = 'free';
          try {
            // ✅ Vérification présence dans prospects
            const { data: prospectMatch, error: prospectError } = await supabase
              .from('prospects')
              .select('id, created_at')
              .eq('email', session.user.email)
              .maybeSingle();

            if (prospectError) throw prospectError;

            if (prospectMatch) {
              // Vérifier si ce prospect est dans les 100 premiers inscrits
              const { data: first100, error: first100Error } = await supabase
                .from('prospects')
                .select('id, email, created_at')
                .order('created_at', { ascending: true })
                .limit(100);

              if (first100Error) throw first100Error;

              const isInFirst100 = first100.some(p => p.email === session.user.email);

              if (isInFirst100) {
                initialPlan = 'pro_trial';
                console.log('✅ Plan "pro_trial" attribué (dans les 100 premiers prospects).');
              } else {
                console.log('ℹ️ Prospect trouvé mais pas dans les 100 premiers, plan "free".');
              }
            } else {
              console.log('ℹ️ Non prospect, plan "free".');
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
              pro_trial_start_date: initialPlan === 'pro_trial' ? new Date().toISOString() : null,
              pro_trial_enabled: initialPlan === 'pro_trial'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          userData = insertData;
        } else {
          userData = data;
        }

        const trialDurationDays = 15;

        // 🔻 Gestion upgrade/downgrade essai
        if (
          userData.pro_trial_enabled &&
          userData.current_plan === 'free' &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffDays = Math.ceil(
            Math.abs(now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= trialDurationDays) {
            console.log('⬆️ [AuthContext] Activation essai Pro.');
            const { error: updateError } = await supabase
              .from('users')
              .update({ current_plan: 'pro_trial' })
              .eq('id', session.user.id);
            if (!updateError) userData.current_plan = 'pro_trial';
          }
        } else if (
          userData.current_plan === 'pro_trial' &&
          userData.pro_trial_enabled &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffDays = Math.ceil(
            Math.abs(now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays > trialDurationDays) {
            console.log('⬇️ [AuthContext] Essai expiré -> free.');
            const { error: downgradeError } = await supabase
              .from('users')
              .update({ current_plan: 'free' })
              .eq('id', session.user.id);
            if (!downgradeError) userData.current_plan = 'free';
          }
        }

        // ✅ Flag isProOrTrial
        let isProOrTrial = false;
        if (userData.pro_subscription_active || userData.current_plan === 'pro') {
          isProOrTrial = true;
        } else if (
          userData.current_plan === 'pro_trial' &&
          userData.pro_trial_enabled &&
          userData.pro_trial_start_date
        ) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffDays = Math.ceil(
            Math.abs(now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays <= trialDurationDays) isProOrTrial = true;
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

        setState({ session, user: newUser, loading: false });
      } catch (error) {
        console.error('❌ [AuthContext] Exception mise à jour utilisateur:', error);
        setState({ session: null, user: null, loading: false });
      }
    } else {
      setState({ session: null, user: null, loading: false });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserState(session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
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
